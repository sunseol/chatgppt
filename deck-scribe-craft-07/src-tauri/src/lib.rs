mod codex_app_server_protocol;
mod codex_app_server_session;
mod codex_app_server_smoke;
mod codex_app_server_stderr;
mod codex_app_server_structured_turn;
mod codex_cli;
mod codex_cli_error;
mod project_folder;
mod redaction;

use codex_app_server_smoke::{
    run_codex_app_server_smoke, CodexAppServerSmokeError, CodexAppServerSmokeEvidence,
};
use codex_app_server_structured_turn::{
    run_codex_app_server_structured_turn, CodexAppServerStructuredTurnEvidence,
    CodexAppServerStructuredTurnRequest,
};
use codex_cli::{
    open_codex_login_terminal, run_codex_login_status, CodexLoginLaunchEvidence,
    CodexLoginStatusEvidence,
};
use codex_cli_error::CodexCliCommandError;
use project_folder::{
    prepare_project_folder_at_root, reveal_project_folder, DeckforgeProjectFolderError,
    DeckforgeProjectFolderEvidence, DeckforgeProjectFolderRequest,
};
use tauri::Manager;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: &'static str,
    version: &'static str,
    desktop_runtime: &'static str,
}

pub fn app_info() -> AppInfo {
    AppInfo {
        name: "DeckForge",
        version: env!("CARGO_PKG_VERSION"),
        desktop_runtime: "tauri-v2",
    }
}

#[tauri::command]
fn deckforge_app_info() -> AppInfo {
    app_info()
}

#[tauri::command]
async fn deckforge_codex_app_server_smoke(
) -> Result<CodexAppServerSmokeEvidence, CodexAppServerSmokeError> {
    tauri::async_runtime::spawn_blocking(run_codex_app_server_smoke)
        .await
        .map_err(|error| {
            CodexAppServerSmokeError::new(
                "blocking_task_failed",
                format!("failed to join app-server smoke task: {error}"),
            )
        })?
}

#[tauri::command]
async fn deckforge_codex_app_server_structured_turn(
    request: CodexAppServerStructuredTurnRequest,
) -> Result<CodexAppServerStructuredTurnEvidence, CodexAppServerSmokeError> {
    tauri::async_runtime::spawn_blocking(move || run_codex_app_server_structured_turn(request))
        .await
        .map_err(|error| {
            CodexAppServerSmokeError::new(
                "blocking_task_failed",
                format!("failed to join app-server structured turn task: {error}"),
            )
        })?
}

#[tauri::command]
async fn deckforge_codex_login_status() -> Result<CodexLoginStatusEvidence, CodexCliCommandError> {
    tauri::async_runtime::spawn_blocking(run_codex_login_status)
        .await
        .map_err(|error| {
            CodexCliCommandError::new(
                "blocking_task_failed",
                format!("failed to join codex login status task: {error}"),
            )
        })?
}

#[tauri::command]
async fn deckforge_open_codex_login_terminal(
) -> Result<CodexLoginLaunchEvidence, CodexCliCommandError> {
    tauri::async_runtime::spawn_blocking(open_codex_login_terminal)
        .await
        .map_err(|error| {
            CodexCliCommandError::new(
                "blocking_task_failed",
                format!("failed to join codex login terminal task: {error}"),
            )
        })?
}

#[tauri::command]
fn deckforge_prepare_project_folder(
    app: tauri::AppHandle,
    request: DeckforgeProjectFolderRequest,
) -> Result<DeckforgeProjectFolderEvidence, DeckforgeProjectFolderError> {
    let root = app.path().app_data_dir().map_err(|error| {
        DeckforgeProjectFolderError::new(
            "app_data_dir_failed",
            format!("failed to resolve app data dir: {error}"),
        )
    })?;
    prepare_project_folder_at_root(&root, &request)
}

#[tauri::command]
fn deckforge_reveal_project_folder(path: String) -> Result<(), DeckforgeProjectFolderError> {
    reveal_project_folder(std::path::Path::new(&path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), tauri::Error> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            deckforge_app_info,
            deckforge_codex_app_server_smoke,
            deckforge_codex_app_server_structured_turn,
            deckforge_codex_login_status,
            deckforge_open_codex_login_terminal,
            deckforge_prepare_project_folder,
            deckforge_reveal_project_folder
        ])
        .run(tauri::generate_context!())
}

#[cfg(test)]
mod tests {
    use super::app_info;

    #[test]
    fn exposes_desktop_app_info() {
        let info = app_info();

        assert_eq!(info.name, "DeckForge");
        assert_eq!(info.version, "0.1.0");
        assert_eq!(info.desktop_runtime, "tauri-v2");
    }

    #[test]
    #[ignore = "requires logged-in local Codex CLI and live app-server access"]
    fn live_codex_app_server_smoke_works() -> Result<(), String> {
        let evidence = tauri::async_runtime::block_on(super::deckforge_codex_app_server_smoke())
            .map_err(|error| format!("{error:?}"))?;

        assert!(evidence.init_ok);
        assert!(evidence.turn_completed);
        assert!(!evidence.thread_id.is_empty());
        assert!(!evidence.turn_id.is_empty());

        Ok(())
    }

    #[test]
    #[ignore = "requires logged-in local Codex CLI and live app-server access"]
    fn live_codex_app_server_structured_turn_works() -> Result<(), String> {
        let evidence = tauri::async_runtime::block_on(super::deckforge_codex_app_server_structured_turn(
            super::CodexAppServerStructuredTurnRequest {
                prompt: "Return only JSON: {\"status\":\"ok\",\"artifact\":\"deckforge_live_structured_turn\"}.".to_owned(),
                output_schema: serde_json::json!({
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["status", "artifact"],
                    "properties": {
                        "status": { "type": "string" },
                        "artifact": { "type": "string" }
                    }
                }),
                model: Some("gpt-5.4".to_owned()),
                network_access: Some(false),
            },
        ))
        .map_err(|error| format!("{error:?}"))?;

        assert!(evidence.turn_completed);
        assert!(!evidence.thread_id.is_empty());
        assert!(!evidence.turn_id.is_empty());
        assert!(evidence
            .event_methods
            .iter()
            .any(|method| method == "turn/completed"));

        Ok(())
    }
}
