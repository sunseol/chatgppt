use crate::codex_cli_error::{CodexCliCommandError, CodexCliCommandResult};
use serde::Serialize;
use std::{
    env,
    ffi::OsString,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

const LOGIN_STATUS_ARGUMENTS: &str = "login status";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexLoginStatusEvidence {
    command: String,
    exit_code: Option<i32>,
    success: bool,
    stdout: String,
    stderr: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexLoginLaunchEvidence {
    command: String,
    launched: bool,
}

#[derive(Debug, Clone)]
struct CodexLauncher {
    program: PathBuf,
    path: Option<OsString>,
}

impl CodexLauncher {
    fn command(&self) -> Command {
        let mut command = Command::new(&self.program);
        if let Some(path) = &self.path {
            command.env("PATH", path);
        }
        command
    }

    fn label(&self) -> String {
        self.program.display().to_string()
    }

    fn login_status_label(&self) -> String {
        format!("{} {}", self.label(), LOGIN_STATUS_ARGUMENTS)
    }

    fn login_shell_command(&self) -> String {
        format!("{} login", command_invocation_prefix(&self.program))
    }
}

pub fn codex_command() -> CodexCliCommandResult<Command> {
    Ok(resolve_codex_launcher()?.command())
}

pub fn run_codex_login_status() -> CodexCliCommandResult<CodexLoginStatusEvidence> {
    run_codex_login_status_with_candidates(codex_binary_candidates(), enriched_path())
}

fn run_codex_login_status_with_candidates(
    candidates: Vec<PathBuf>,
    path: Option<OsString>,
) -> CodexCliCommandResult<CodexLoginStatusEvidence> {
    let launcher = resolve_codex_launcher_from_candidates(candidates, path)?;
    let output = launcher
        .command()
        .arg("login")
        .arg("status")
        .output()
        .map_err(|error| {
            CodexCliCommandError::new(
                "codex_login_status_failed",
                format!("failed to run codex login status: {error}"),
            )
        })?;

    Ok(CodexLoginStatusEvidence {
        command: launcher.login_status_label(),
        exit_code: output.status.code(),
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub fn open_codex_login_terminal() -> CodexCliCommandResult<CodexLoginLaunchEvidence> {
    let command = resolve_codex_launcher()?.login_shell_command();
    let launch = terminal_login_launch(&command);
    let status = Command::new(&launch.program)
        .args(&launch.args)
        .status()
        .map_err(|error| {
            CodexCliCommandError::new(
                "codex_login_terminal_failed",
                format!("failed to open {} for codex login: {error}", launch.label),
            )
        })?;

    if !status.success() {
        return Err(CodexCliCommandError::new(
            "codex_login_terminal_failed",
            format!("{} launch exited with status {status}", launch.label),
        ));
    }

    Ok(CodexLoginLaunchEvidence {
        command,
        launched: true,
    })
}

fn resolve_codex_launcher() -> CodexCliCommandResult<CodexLauncher> {
    resolve_codex_launcher_from_candidates(codex_binary_candidates(), enriched_path())
}

fn resolve_codex_launcher_from_candidates(
    candidates: Vec<PathBuf>,
    path: Option<OsString>,
) -> CodexCliCommandResult<CodexLauncher> {
    let mut failures = Vec::new();
    for candidate in unique_codex_candidates(candidates) {
        if !is_search_path_command(&candidate) && !candidate.is_file() {
            continue;
        }
        match probe_codex_candidate(&candidate, path.as_ref()) {
            Ok(()) => {
                return Ok(CodexLauncher {
                    program: candidate,
                    path,
                });
            }
            Err(message) => failures.push(message),
        }
    }
    Err(CodexCliCommandError::new(
        "codex_cli_unavailable",
        unavailable_message(&failures),
    ))
}

fn codex_binary_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(value) = env::var_os("CODEX_BIN") {
        if !value.is_empty() {
            candidates.push(PathBuf::from(value));
        }
    }

    if cfg!(windows) {
        if let Some(appdata) = env::var_os("APPDATA") {
            let npm = PathBuf::from(appdata).join("npm");
            candidates.push(npm.join("codex.cmd"));
            candidates.push(npm.join("codex.exe"));
        }
        if let Some(local_appdata) = env::var_os("LOCALAPPDATA") {
            let pnpm = PathBuf::from(local_appdata).join("pnpm");
            candidates.push(pnpm.join("codex.cmd"));
            candidates.push(pnpm.join("codex.exe"));
        }
        candidates.push(PathBuf::from("codex.cmd"));
        candidates.push(PathBuf::from("codex.exe"));
    } else {
        if let Some(home) = home_dir() {
            candidates.push(home.join(".local/bin/codex"));
        }
        candidates.push(PathBuf::from("/opt/homebrew/bin/codex"));
        candidates.push(PathBuf::from("/usr/local/bin/codex"));
        if let Some(home) = home_dir() {
            candidates.push(home.join(".cargo/bin/codex"));
            candidates.push(home.join(".bun/bin/codex"));
        }
    }

    candidates.push(PathBuf::from("codex"));
    candidates
}

fn unique_codex_candidates(candidates: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut unique = Vec::new();
    for candidate in candidates {
        if unique.iter().any(|path| path == &candidate) {
            continue;
        }
        unique.push(candidate);
    }
    unique
}

fn probe_codex_candidate(candidate: &Path, path: Option<&OsString>) -> Result<(), String> {
    let mut command = Command::new(candidate);
    if let Some(value) = path {
        command.env("PATH", value);
    }
    let output = command
        .arg("--help")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .output()
        .map_err(|error| format!("{}: {error}", candidate.display()))?;
    if output.status.success() {
        return Ok(());
    }
    Err(format!(
        "{}: {}",
        candidate.display(),
        compact_process_failure(output.status.code(), &output.stderr)
    ))
}

fn compact_process_failure(exit_code: Option<i32>, stderr: &[u8]) -> String {
    let stderr_text = String::from_utf8_lossy(stderr);
    let first_line = stderr_text.lines().next().unwrap_or("no stderr");
    format!("exit {:?}, {}", exit_code, first_line)
}

fn unavailable_message(failures: &[String]) -> String {
    let summary = if failures.is_empty() {
        "no executable candidates were found".to_owned()
    } else {
        failures
            .iter()
            .take(3)
            .cloned()
            .collect::<Vec<_>>()
            .join("; ")
    };
    format!(
        "Codex CLI is not runnable. Run `codex login status` in Terminal or reinstall the Codex CLI, then reopen DeckForge. Tried: {summary}"
    )
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn enriched_path() -> Option<OsString> {
    let mut paths = env::var_os("PATH")
        .map(|value| env::split_paths(&value).collect::<Vec<_>>())
        .unwrap_or_default();
    for candidate in codex_binary_candidates() {
        if let Some(parent) = candidate.parent() {
            push_unique_path(&mut paths, parent);
        }
    }
    env::join_paths(paths).ok()
}

fn push_unique_path(paths: &mut Vec<PathBuf>, candidate: &Path) {
    if paths.iter().any(|path| path == candidate) {
        return;
    }
    paths.push(candidate.to_path_buf());
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TerminalLoginLaunch {
    program: String,
    args: Vec<String>,
    label: String,
}

fn terminal_login_launch(command: &str) -> TerminalLoginLaunch {
    if cfg!(target_os = "macos") {
        return TerminalLoginLaunch {
            program: "osascript".to_owned(),
            args: vec!["-e".to_owned(), terminal_login_script(command)],
            label: "macOS Terminal".to_owned(),
        };
    }

    if cfg!(windows) {
        return TerminalLoginLaunch {
            program: "cmd".to_owned(),
            args: vec![
                "/C".to_owned(),
                "start".to_owned(),
                "DeckForge Codex Login".to_owned(),
                "cmd".to_owned(),
                "/K".to_owned(),
                command.to_owned(),
            ],
            label: "Windows Command Prompt".to_owned(),
        };
    }

    let quoted_command = shell_single_quote(command);
    TerminalLoginLaunch {
        program: "sh".to_owned(),
        args: vec![
            "-lc".to_owned(),
            format!(
                "x-terminal-emulator -e sh -lc {0} || gnome-terminal -- sh -lc {0} || konsole -e sh -lc {0}",
                quoted_command
            ),
        ],
        label: "system terminal".to_owned(),
    }
}

fn command_invocation_prefix(program: &Path) -> String {
    let label = program.display().to_string();
    if is_search_path_command(program) {
        return label;
    }
    if cfg!(windows) {
        return windows_cmd_quote(&label);
    }
    shell_single_quote(&label)
}

fn is_search_path_command(path: &Path) -> bool {
    path.components().count() == 1
}

fn windows_cmd_quote(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn terminal_login_script(command: &str) -> String {
    format!(
        "tell application \"Terminal\"\nactivate\ndo script {}\nend tell",
        applescript_string_literal(command)
    )
}

fn applescript_string_literal(value: &str) -> String {
    let mut output = String::from("\"");
    for character in value.chars() {
        if character == '\\' || character == '"' {
            output.push('\\');
        }
        output.push(character);
    }
    output.push('"');
    output
}

fn shell_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

#[cfg(test)]
#[path = "codex_cli_tests.rs"]
mod tests;
