mod codex_app_server_protocol;
mod codex_app_server_session;
mod codex_app_server_smoke;
mod codex_app_server_structured_turn;

use codex_app_server_smoke::{
    run_codex_app_server_smoke, CodexAppServerSmokeError, CodexAppServerSmokeEvidence,
};
use codex_app_server_structured_turn::{
    run_codex_app_server_structured_turn, CodexAppServerStructuredTurnEvidence,
    CodexAppServerStructuredTurnRequest,
};

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
fn deckforge_codex_app_server_smoke(
) -> Result<CodexAppServerSmokeEvidence, CodexAppServerSmokeError> {
    run_codex_app_server_smoke()
}

#[tauri::command]
fn deckforge_codex_app_server_structured_turn(
    request: CodexAppServerStructuredTurnRequest,
) -> Result<CodexAppServerStructuredTurnEvidence, CodexAppServerSmokeError> {
    run_codex_app_server_structured_turn(request)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), tauri::Error> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            deckforge_app_info,
            deckforge_codex_app_server_smoke,
            deckforge_codex_app_server_structured_turn
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
}
