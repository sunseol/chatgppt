use crate::{
    codex_app_server_protocol::{first_string_at, smoke_output_schema, SmokeAccumulator},
    codex_app_server_session::AppServerSession,
};
use serde::Serialize;
use serde_json::json;
use std::time::Duration;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
const TURN_TIMEOUT: Duration = Duration::from_secs(120);

pub(super) type SmokeResult<T> = Result<T, CodexAppServerSmokeError>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexAppServerSmokeEvidence {
    pub init_ok: bool,
    pub account_type: Option<String>,
    pub thread_id: String,
    pub turn_id: String,
    pub turn_completed: bool,
    pub protocol_line_count: usize,
    pub stderr_log_line_count: usize,
    pub event_methods: Vec<String>,
    pub final_text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexAppServerSmokeError {
    pub code: String,
    pub message: String,
}

impl CodexAppServerSmokeError {
    pub(super) fn new(code: &str, message: String) -> Self {
        Self {
            code: code.to_owned(),
            message,
        }
    }
}

pub fn run_codex_app_server_smoke() -> SmokeResult<CodexAppServerSmokeEvidence> {
    let mut session = AppServerSession::spawn()?;
    let initialize = session.request(
        "initialize",
        json!({
            "clientInfo": {
                "name": "deckforge-live-smoke",
                "version": "0.1.0"
            },
            "capabilities": {
                "experimentalApi": true
            }
        }),
        REQUEST_TIMEOUT,
    )?;
    let account = session.request("account/read", json!({}), REQUEST_TIMEOUT)?;
    let cwd = std::env::current_dir().map_err(|error| {
        CodexAppServerSmokeError::new("cwd_failed", format!("failed to read cwd: {error}"))
    })?;
    let thread = session.request(
        "thread/start",
        json!({
            "cwd": cwd,
            "approvalPolicy": "never",
            "sandbox": "read-only",
            "model": "gpt-5.4"
        }),
        REQUEST_TIMEOUT,
    )?;
    let thread_id = first_string_at(
        &thread,
        &[
            &["result", "thread", "id"],
            &["result", "threadId"],
            &["result", "id"],
        ],
    )
    .ok_or_else(|| {
        CodexAppServerSmokeError::new(
            "missing_thread_id",
            "thread/start returned no id".to_owned(),
        )
    })?
    .to_owned();
    let turn = session.request(
        "turn/start",
        json!({
            "threadId": thread_id,
            "input": [{
                "type": "text",
                "text": "Return only JSON matching the schema. Use artifact \"deckforge_live_current_smoke\", stage \"current_health\", mock false, fixture false, status \"ok\"."
            }],
            "outputSchema": smoke_output_schema(),
            "approvalPolicy": "never",
            "sandboxPolicy": {
                "type": "readOnly",
                "networkAccess": false
            }
        }),
        REQUEST_TIMEOUT,
    )?;
    let turn_id = first_string_at(
        &turn,
        &[
            &["result", "turn", "id"],
            &["result", "turnId"],
            &["result", "id"],
        ],
    )
    .ok_or_else(|| {
        CodexAppServerSmokeError::new("missing_turn_id", "turn/start returned no id".to_owned())
    })?
    .to_owned();
    session.wait_for_method("turn/completed", TURN_TIMEOUT)?;

    let mut accumulator = SmokeAccumulator::default();
    for notification in session.notifications() {
        accumulator.observe(notification);
    }
    let final_text = accumulator.final_text.take().ok_or_else(|| {
        CodexAppServerSmokeError::new(
            "missing_final_text",
            "turn completed without final text".to_owned(),
        )
    })?;
    let event_methods = std::mem::take(&mut accumulator.event_methods);

    Ok(CodexAppServerSmokeEvidence {
        init_ok: initialize.get("result").is_some(),
        account_type: first_string_at(
            &account,
            &[&["result", "account", "type"], &["result", "type"]],
        )
        .map(str::to_owned),
        thread_id,
        turn_id,
        turn_completed: accumulator.turn_completed,
        protocol_line_count: session.protocol_line_count(),
        stderr_log_line_count: session.stderr_log_line_count(),
        event_methods,
        final_text,
    })
}
