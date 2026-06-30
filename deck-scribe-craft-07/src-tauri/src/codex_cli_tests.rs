use super::{
    applescript_string_literal, run_codex_login_status_with_candidates, shell_single_quote,
    terminal_login_script, LOGIN_STATUS_ARGUMENTS,
};
use std::{env, error::Error, fs, os::unix::fs::PermissionsExt, path::Path};

#[test]
fn exposes_status_command_label() {
    assert_eq!(
        format!("codex {LOGIN_STATUS_ARGUMENTS}"),
        "codex login status"
    );
}

#[test]
fn escapes_applescript_string_values() {
    assert_eq!(
        applescript_string_literal("codex login --note \"A\\B\""),
        "\"codex login --note \\\"A\\\\B\\\"\""
    );
}

#[test]
fn quotes_shell_paths_for_terminal_login() {
    assert_eq!(
        shell_single_quote("/Users/jake/Library/Application Support/codex"),
        "'/Users/jake/Library/Application Support/codex'"
    );
    assert_eq!(shell_single_quote("/tmp/codex'bin"), "'/tmp/codex'\\''bin'");
}

#[test]
fn builds_terminal_login_script() {
    let script = terminal_login_script("codex login");

    assert!(script.contains("tell application \"Terminal\""));
    assert!(script.contains("activate"));
    assert!(script.contains("do script \"codex login\""));
}

#[test]
fn skips_broken_codex_candidate_and_uses_working_candidate() -> Result<(), Box<dyn Error>> {
    let root = env::temp_dir().join("deckforge_codex_candidate_test");
    if root.exists() {
        fs::remove_dir_all(&root)?;
    }
    fs::create_dir_all(&root)?;
    let broken = root.join("broken-codex");
    let working = root.join("working-codex");
    write_executable(
        &broken,
        "#!/bin/sh\necho 'Error: spawn /missing/vendor/codex ENOENT' >&2\nexit 1\n",
    )?;
    write_executable(
        &working,
        "#!/bin/sh\nif [ \"$1\" = \"--help\" ]; then echo help; exit 0; fi\nif [ \"$1\" = \"login\" ] && [ \"$2\" = \"status\" ]; then echo 'Logged in using ChatGPT'; exit 0; fi\nexit 2\n",
    )?;

    let evidence = run_codex_login_status_with_candidates(vec![broken, working], None)?;

    assert!(evidence.success);
    assert!(evidence.stdout.contains("Logged in using ChatGPT"));
    fs::remove_dir_all(root)?;
    Ok(())
}

#[test]
fn redacts_login_status_stdout_and_stderr() -> Result<(), Box<dyn Error>> {
    let root = env::temp_dir().join("deckforge_codex_redaction_test");
    if root.exists() {
        fs::remove_dir_all(&root)?;
    }
    fs::create_dir_all(&root)?;
    let working = root.join("working-codex");
    write_executable(
        &working,
        "#!/bin/sh\nif [ \"$1\" = \"--help\" ]; then echo help; exit 0; fi\nif [ \"$1\" = \"login\" ] && [ \"$2\" = \"status\" ]; then echo 'OPENAI_API_KEY=sk-live-secret'; echo 'Authorization: Bearer codex.session.secret' >&2; exit 0; fi\nexit 2\n",
    )?;

    let evidence = run_codex_login_status_with_candidates(vec![working], None)?;

    assert_eq!(evidence.stdout.trim(), "OPENAI_API_KEY=[redacted]");
    assert_eq!(evidence.stderr.trim(), "Authorization: Bearer [redacted]");
    fs::remove_dir_all(root)?;
    Ok(())
}

fn write_executable(path: &Path, content: &str) -> Result<(), Box<dyn Error>> {
    fs::write(path, content)?;
    let mut permissions = fs::metadata(path)?.permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions)?;
    Ok(())
}
