# Test Spec: DF-144 Sensitive Info Redaction

## Unit

- Redaction removes API keys, bearer tokens, generic secrets, and Codex auth file paths.
- Renderer sandbox rejects sensitive Codex auth path literals.
- Project export redacts Codex auth paths from project JSON and still passes the export secret scan.

## Scans

- Log redaction scan: verify representative log text has no raw secret-like values.
- Project artifact secret scan: verify exported project content has no raw secret or auth path.
- Renderer sensitive path scan: verify sandbox blocks auth path access surfaces.
