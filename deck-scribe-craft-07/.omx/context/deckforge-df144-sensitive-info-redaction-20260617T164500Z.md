# DF-144 Sensitive Info Redaction Context

Ticket: DF-144 민감 정보 보호와 로그 redaction
Date: 2026-06-17

## Ticket Source

- Priority: P0
- Scope: 토큰, API Key, Authorization 헤더, Codex auth 파일 경로가 프론트엔드/로그/프로젝트 파일에 노출되지 않게 한다.
- Acceptance:
  - 로그 redaction test가 통과한다.
  - 프로젝트 폴더에 인증 정보가 저장되지 않는다.
  - renderer에서 민감 경로를 직접 읽을 수 없다.
- Verification:
  - security log scan
  - project artifact secret scan

## Existing State

- `redaction.ts` already covers OpenAI-style API keys, bearer tokens, and generic secret assignments.
- `project-export.ts` redacts project JSON and runs a secret-like scan.
- `layout-renderer-sandbox.ts` blocks external URL/file request surfaces, Tauri APIs, scripts, and inline handlers.

## Implementation Notes

- Extend redaction to cover Codex auth file paths such as `/Users/.../.codex/auth.json`.
- Extend renderer sandbox to reject Codex auth path literals even when not used as a URL.
- Extend export tests so project files cannot contain raw Codex auth paths.
