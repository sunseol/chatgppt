use super::{
    applescript_string_literal, command_invocation_prefix, is_search_path_command,
    run_codex_login_status_with_candidates, shell_single_quote, terminal_login_launch,
    terminal_login_script, windows_cmd_quote, LOGIN_STATUS_ARGUMENTS,
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
fn builds_platform_terminal_login_launcher() {
    let launch = terminal_login_launch("codex login");

    if cfg!(target_os = "macos") {
        assert_eq!(launch.program, "osascript");
        assert_eq!(launch.label, "macOS Terminal");
        assert!(launch.args.join(" ").contains("codex login"));
    } else if cfg!(windows) {
        assert_eq!(launch.program, "cmd");
        assert_eq!(launch.label, "Windows Command Prompt");
        assert_eq!(
            launch.args,
            vec![
                "/C",
                "start",
                "DeckForge Codex Login",
                "cmd",
                "/K",
                "codex login"
            ]
        );
    } else {
        assert_eq!(launch.program, "sh");
        assert_eq!(launch.label, "system terminal");
        assert!(launch.args.join(" ").contains("x-terminal-emulator"));
    }
}

#[test]
fn formats_search_path_and_quoted_login_commands() {
    assert!(is_search_path_command(Path::new("codex")));
    assert!(is_search_path_command(Path::new("codex.cmd")));
    assert!(!is_search_path_command(Path::new("/Users/jake/bin/codex")));
    assert_eq!(
        command_invocation_prefix(Path::new("codex.cmd")),
        "codex.cmd"
    );

    if cfg!(windows) {
        assert_eq!(
            windows_cmd_quote("C:\\Program Files\\Codex\\codex.cmd"),
            "\"C:\\Program Files\\Codex\\codex.cmd\""
        );
    } else {
        assert_eq!(
            command_invocation_prefix(Path::new("/Users/jake/Library/Application Support/codex")),
            "'/Users/jake/Library/Application Support/codex'"
        );
    }
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

fn write_executable(path: &Path, content: &str) -> Result<(), Box<dyn Error>> {
    fs::write(path, content)?;
    let mut permissions = fs::metadata(path)?.permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions)?;
    Ok(())
}
