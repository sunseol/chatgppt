use crate::{
    codex_cli_error::{CodexCliCommandError, CodexCliCommandResult},
    redaction::redact_sensitive_text,
};
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
        if self.program == Path::new("codex") {
            return "codex login".to_owned();
        }
        format!(
            "{} login",
            shell_single_quote(&self.program.display().to_string())
        )
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
        stdout: redact_sensitive_text(&String::from_utf8_lossy(&output.stdout)),
        stderr: redact_sensitive_text(&String::from_utf8_lossy(&output.stderr)),
    })
}

pub fn open_codex_login_terminal() -> CodexCliCommandResult<CodexLoginLaunchEvidence> {
    let command = resolve_codex_launcher()?.login_shell_command();
    let script = terminal_login_script(&command);
    let status = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .status()
        .map_err(|error| {
            CodexCliCommandError::new(
                "codex_login_terminal_failed",
                format!("failed to open Terminal for codex login: {error}"),
            )
        })?;

    if !status.success() {
        return Err(CodexCliCommandError::new(
            "codex_login_terminal_failed",
            format!("Terminal launch exited with status {status}"),
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
        if candidate != Path::new("codex") && !candidate.is_file() {
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
    if let Some(home) = home_dir() {
        candidates.push(home.join(".local/bin/codex"));
    }
    candidates.push(PathBuf::from("/opt/homebrew/bin/codex"));
    candidates.push(PathBuf::from("/usr/local/bin/codex"));
    if let Some(home) = home_dir() {
        candidates.push(home.join(".cargo/bin/codex"));
        candidates.push(home.join(".bun/bin/codex"));
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
    format!(
        "exit {:?}, {}",
        exit_code,
        redact_sensitive_text(first_line)
    )
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
