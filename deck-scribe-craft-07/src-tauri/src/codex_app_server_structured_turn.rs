use crate::{
    codex_app_server_protocol::first_string_at,
    codex_app_server_session::AppServerSession,
    codex_app_server_smoke::{CodexAppServerSmokeError, SmokeResult},
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::{Duration, Instant};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
const TURN_TIMEOUT: Duration = Duration::from_secs(180);
const MAX_TURN_TIMEOUT_MS: u64 = 30 * 60 * 1_000;
const DEFAULT_MODEL: &str = "gpt-5.4";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexAppServerStructuredTurnRequest {
    pub prompt: String,
    pub output_schema: Value,
    pub model: Option<String>,
    pub network_access: Option<bool>,
    pub turn_timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexAppServerStructuredTurnEvidence {
    pub runtime: String,
    pub thread_id: String,
    pub turn_id: String,
    pub turn_completed: bool,
    pub duration_ms: u64,
    pub protocol_line_count: usize,
    pub stderr_log_line_count: usize,
    pub event_methods: Vec<String>,
    pub notifications: Vec<Value>,
}

pub fn run_codex_app_server_structured_turn(
    request: CodexAppServerStructuredTurnRequest,
) -> SmokeResult<CodexAppServerStructuredTurnEvidence> {
    validate_request(&request)?;
    let started_at = Instant::now();
    let mut session = AppServerSession::spawn()?;
    initialize_session(&mut session)?;
    let thread_id = start_thread(&mut session, &request)?;
    let turn_id = start_turn(&mut session, &thread_id, &request)?;
    session.wait_for_method("turn/completed", turn_timeout(&request))?;
    let duration_ms = duration_millis(started_at.elapsed());
    let notifications = session.take_notifications();
    let event_methods = collect_event_methods(&notifications);

    Ok(CodexAppServerStructuredTurnEvidence {
        runtime: "codex app-server --stdio".to_owned(),
        thread_id,
        turn_id,
        turn_completed: true,
        duration_ms,
        protocol_line_count: session.protocol_line_count(),
        stderr_log_line_count: session.stderr_log_line_count(),
        event_methods,
        notifications,
    })
}

fn initialize_session(session: &mut AppServerSession) -> SmokeResult<()> {
    session.request(
        "initialize",
        json!({
            "clientInfo": {
                "name": "deckforge-live-structured-turn",
                "version": "0.1.0"
            },
            "capabilities": {
                "experimentalApi": true
            }
        }),
        REQUEST_TIMEOUT,
    )?;
    Ok(())
}

fn start_thread(
    session: &mut AppServerSession,
    request: &CodexAppServerStructuredTurnRequest,
) -> SmokeResult<String> {
    let cwd = std::env::current_dir().map_err(|error| {
        CodexAppServerSmokeError::new("cwd_failed", format!("failed to read cwd: {error}"))
    })?;
    let thread = session.request(
        "thread/start",
        json!({
            "cwd": cwd,
            "approvalPolicy": "never",
            "sandbox": "read-only",
            "model": model_name(request)
        }),
        REQUEST_TIMEOUT,
    )?;
    first_string_at(
        &thread,
        &[
            &["result", "thread", "id"],
            &["result", "threadId"],
            &["result", "id"],
        ],
    )
    .map(str::to_owned)
    .ok_or_else(|| {
        CodexAppServerSmokeError::new(
            "missing_thread_id",
            "thread/start returned no id".to_owned(),
        )
    })
}

fn start_turn(
    session: &mut AppServerSession,
    thread_id: &str,
    request: &CodexAppServerStructuredTurnRequest,
) -> SmokeResult<String> {
    let turn = session.request(
        "turn/start",
        build_turn_start_params(thread_id, request),
        REQUEST_TIMEOUT,
    )?;
    first_string_at(
        &turn,
        &[
            &["result", "turn", "id"],
            &["result", "turnId"],
            &["result", "id"],
        ],
    )
    .map(str::to_owned)
    .ok_or_else(|| {
        CodexAppServerSmokeError::new("missing_turn_id", "turn/start returned no id".to_owned())
    })
}

fn build_turn_start_params(
    thread_id: &str,
    request: &CodexAppServerStructuredTurnRequest,
) -> Value {
    json!({
        "threadId": thread_id,
        "input": [{
            "type": "text",
            "text": request.prompt
        }],
        "outputSchema": request.output_schema,
        "approvalPolicy": "never",
        "sandboxPolicy": {
            "type": "readOnly",
            "networkAccess": network_access(request)
        }
    })
}

fn validate_request(request: &CodexAppServerStructuredTurnRequest) -> SmokeResult<()> {
    if request.prompt.trim().is_empty() {
        return Err(CodexAppServerSmokeError::new(
            "invalid_structured_turn_request",
            "prompt is required".to_owned(),
        ));
    }
    if !request.output_schema.is_object() {
        return Err(CodexAppServerSmokeError::new(
            "invalid_structured_turn_request",
            "outputSchema must be a JSON object".to_owned(),
        ));
    }
    if let Some(timeout_ms) = request.turn_timeout_ms {
        if timeout_ms == 0 || timeout_ms > MAX_TURN_TIMEOUT_MS {
            return Err(CodexAppServerSmokeError::new(
                "invalid_structured_turn_request",
                format!("turnTimeoutMs must be between 1 and {MAX_TURN_TIMEOUT_MS}"),
            ));
        }
    }
    Ok(())
}

fn model_name(request: &CodexAppServerStructuredTurnRequest) -> String {
    match request.model.as_deref().map(str::trim) {
        Some(value) if !value.is_empty() => value.to_owned(),
        _ => DEFAULT_MODEL.to_owned(),
    }
}

fn network_access(request: &CodexAppServerStructuredTurnRequest) -> bool {
    request.network_access == Some(true)
}

fn turn_timeout(request: &CodexAppServerStructuredTurnRequest) -> Duration {
    request
        .turn_timeout_ms
        .map(Duration::from_millis)
        .unwrap_or(TURN_TIMEOUT)
}

fn collect_event_methods(notifications: &[Value]) -> Vec<String> {
    let mut methods = Vec::new();
    for notification in notifications {
        let Some(method) = notification.get("method").and_then(Value::as_str) else {
            continue;
        };
        if !methods.iter().any(|seen| seen == method) {
            methods.push(method.to_owned());
        }
    }
    methods
}

fn duration_millis(duration: Duration) -> u64 {
    duration
        .as_secs()
        .saturating_mul(1_000)
        .saturating_add(u64::from(duration.subsec_millis()))
}

#[cfg(test)]
mod tests {
    use super::{
        build_turn_start_params, collect_event_methods, model_name, turn_timeout, validate_request,
        CodexAppServerStructuredTurnRequest,
    };
    use serde_json::json;

    #[test]
    fn builds_schema_constrained_structured_turn_params() {
        let request = CodexAppServerStructuredTurnRequest {
            prompt: "Return JSON only.".to_owned(),
            output_schema: json!({
                "type": "object",
                "required": ["status"],
                "properties": {
                    "status": { "type": "string" }
                }
            }),
            model: Some("gpt-5.4-mini".to_owned()),
            network_access: Some(false),
            turn_timeout_ms: None,
        };

        let params = build_turn_start_params("thread_live", &request);

        assert_eq!(params["threadId"], "thread_live");
        assert_eq!(params["input"][0]["text"], "Return JSON only.");
        assert_eq!(params["outputSchema"]["required"][0], "status");
        assert_eq!(params["approvalPolicy"], "never");
        assert_eq!(params["sandboxPolicy"]["type"], "readOnly");
        assert_eq!(params["sandboxPolicy"]["networkAccess"], false);
        assert_eq!(model_name(&request), "gpt-5.4-mini");
    }

    #[test]
    fn uses_custom_turn_timeout_without_changing_turn_params() {
        let request = CodexAppServerStructuredTurnRequest {
            prompt: "Return JSON only.".to_owned(),
            output_schema: json!({ "type": "object" }),
            model: None,
            network_access: None,
            turn_timeout_ms: Some(600_000),
        };

        let params = build_turn_start_params("thread_live", &request);

        assert!(validate_request(&request).is_ok());
        assert_eq!(turn_timeout(&request), std::time::Duration::from_secs(600));
        assert!(params.get("turnTimeoutMs").is_none());
    }

    #[test]
    fn rejects_out_of_range_turn_timeout() {
        let request = CodexAppServerStructuredTurnRequest {
            prompt: "Return JSON only.".to_owned(),
            output_schema: json!({ "type": "object" }),
            model: None,
            network_access: None,
            turn_timeout_ms: Some(0),
        };

        let error = validate_request(&request).err();

        assert_eq!(
            error.as_ref().map(|error| error.code.as_str()),
            Some("invalid_structured_turn_request")
        );
    }

    #[test]
    fn summarizes_unique_notification_methods_in_order() {
        let methods = collect_event_methods(&[
            json!({ "method": "turn/started" }),
            json!({ "method": "item/completed" }),
            json!({ "method": "item/completed" }),
            json!({ "method": "turn/completed" }),
        ]);

        assert_eq!(
            methods,
            ["turn/started", "item/completed", "turn/completed"]
        );
    }
}
