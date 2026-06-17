# PRD: DF-144 Sensitive Info Redaction

## Goal

Prevent credentials and Codex local authentication file paths from appearing in logs, front-end output, renderer HTML, or exported project artifacts.

## Requirements

- Redact API keys, bearer tokens, generic token/secret assignments, and Codex auth file paths.
- Ensure exported project JSON contains redacted values and passes the export secret scan.
- Ensure renderer sandbox rejects HTML containing sensitive Codex auth file paths.
- Keep redaction deterministic and conservative.

## Non-Goals

- Do not implement a full DLP engine.
- Do not scan binary PNG bytes.
- Do not change Codex authentication behavior.
