# Live Auth Secret Lifecycle

Date: 2026-06-19

Scope: DF-205 / GitHub issue `#131`, Live authentication and secret lifecycle.

## Acceptance contract

| Requirement                                                                     | Local contract                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official Codex runtime login/session flow                                       | Local runtime check uses `codex-cli 0.141.0`; `codex login status` returned `Logged in using ChatGPT` without exposing token material.                                                                                                                                                                  |
| Do not copy raw ChatGPT/Codex access tokens into project DB                     | Project persistence continues to store provider provenance and references only. Package scans below found no `auth.json` file, `.codex` directory payload, `CODEX_SESSION=...`, long Bearer token, or OpenAI key-shaped value in production assets.                                                     |
| Store image API keys in OS keychain or equivalent secret store                  | `connectImageApiKeySecret` accepts an injected `LiveSecretStore`, writes the trimmed secret through `saveSecret`, rejects secret references that echo raw key material, and returns only a `LiveSecretReference` plus public label. The test asserts the returned JSON does not contain the raw secret. |
| Distinguish login expiry, 401, permission, and organization verification states | `classifyLiveAuthFailure` maps `session_expired` 401, generic 401, generic 403, and 403 organization-verification messages to separate user-facing states.                                                                                                                                              |
| Logout cancels related live jobs and locks UI                                   | `cancelLiveJobsForAuthLogout` requests cancellation for active live jobs, and `createLiveAuthLogoutLockState` returns `uiLocked: true` with `requiresAuth` provider statuses.                                                                                                                           |

## Local package and secret scan

Command evidence from 2026-06-19:

```sh
bun run package:dry-run
codex --version
codex login status
find dist/client dist/server dist/deckforge-macos-dry-run/DeckForge.app -name 'auth.json' -o -path '*/.codex/*'
```

Observed local runtime:

- Codex CLI: `codex-cli 0.141.0`
- Login status: `Logged in using ChatGPT`

Dry-run package evidence:

- Archive: `dist/deckforge-macos-dry-run.tgz`
- SHA-256: `377df1eabfc41128c08d24f6c00a40b2f80dac01ccd7f4fc90e810f16924d20e`
- Archive size: 281,804 bytes
- Extracted app bundle: `dist/deckforge-macos-dry-run/DeckForge.app`
- App bundle size: 1,032 KiB
- App bundle files: 17
- Archive members: 26

Secret scan scope:

- `dist/client`
- `dist/server`
- `dist/deckforge-macos-dry-run/DeckForge.app`

Scan result:

- OpenAI/Codex secret-like values: 0 hits for `sk-proj-*`, `sk-svcacct-*`, legacy long `sk-*`, `OPENAI_API_KEY=...`, `CODEX_SESSION=...`, or long `Bearer ...` values.
- Bundled `auth.json` or `.codex` payload files: 0 hits.
- Literal `.codex`, `OPENAI_API_KEY`, and `CODEX_SESSION` text appears only in redaction regex and sensitive-path guard code, for example `CODEX_AUTH_PATH_PATTERN` and `SECRET_ASSIGNMENT_PATTERN`.
- Broad `sk-*` scans can match Tailwind/class-merge class group names such as `sk-image-linear-from-pos`; those are CSS utility identifiers, not OpenAI API keys.

## Remaining evidence before close

DF-205 should remain open until the missing Live evidence is produced:

- Fresh login manual QA from an unauthenticated account or clean macOS account.
- Logout/relogin QA that proves live jobs cancel and provider actions stay locked until login is restored.
- Packaged app image credential setup through the OS keychain or equivalent desktop secret store.
