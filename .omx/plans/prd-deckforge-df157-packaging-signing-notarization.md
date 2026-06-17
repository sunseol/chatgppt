# PRD: DF-157 Packaging, Code Signing, Notarization Prep

## Problem

DeckForge needs a repeatable internal packaging path before release packaging can be signed and notarized. The current worktree does not contain a Tauri bundle, so packaging prep must distinguish the runnable current build from the future signed native release.

## Scope

- Add an internal packaging dry-run command.
- Produce an unsigned macOS `.app` bundle shape from current build outputs.
- Archive the dry-run bundle for internal test handoff.
- Document code signing, notarization, credentials, and fallback test path.

## Acceptance Criteria

- A command can generate an internal test package.
- Signing/notarization requirements and required certificates are documented.
- If release packaging fails, a fallback test path remains available.

## Non-Goals

- Add Tauri dependencies.
- Perform real Apple code signing or notarization.
- Claim this dry-run package is a production release artifact.
