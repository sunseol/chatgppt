# Live Auth Secret Lifecycle

Date: 2026-06-19

Scope: DF-205 / GitHub issue `#131`, Live authentication and secret lifecycle.

## Acceptance contract

| Requirement                                                                     | Local contract                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official Codex runtime login/session flow                                       | Local runtime check uses `codex-cli 0.141.0`; `codex login status` returned `Logged in using ChatGPT` without exposing token material.                                                                                                                                                                  |
| Do not copy raw ChatGPT/Codex access tokens into project DB                     | `serializeProjectList` redacts raw API keys, bare or quoted `CODEX_SESSION=...` values, serialized secret fields such as `"token":"..."`, `"access_token":"..."`, `"refreshToken":"..."`, `"id_token":"..."`, `"sessionToken":"..."`, and `"clientSecret":"..."`, Bearer/Basic/token Authorization credentials, and `.codex/auth.json` paths before local project DB serialization. Project persistence continues to store provider provenance and references only. Package scans below found no `auth.json` file, `.codex` directory payload, `CODEX_SESSION=...`, long Bearer token, or OpenAI key-shaped value in production assets. |
| Store image API keys in OS keychain or equivalent secret store                  | `connectImageApiKeySecret` accepts an injected `LiveSecretStore`, writes the trimmed secret through `saveSecret`, rejects secret references that echo raw, URL-encoded, base64, base64url, or hex key material, rejects any returned unsupported store kind or store-kind mismatch, rejects references with the wrong service or account scope, and returns only a `LiveSecretReference` plus public label. `disconnectImageApiKeySecret` rejects store-kind mismatch before delete, deletes the stored key through `deleteSecret`, and returns a missing-credential state without returning the secret reference. |
| Distinguish login expiry, 401, permission, and organization verification states | `classifyLiveAuthFailure` normalizes provider reason/message evidence and maps `session_expired`, `login_expired`, and `Session expired` 401 failures separately from generic 401 unauthorized failures. It also keeps 403 organization-verification evidence, including `verify your organization` messages, separate from generic insufficient-permission failures. |
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
- SHA-256: `83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7`
- Archive size: 284,517 bytes
- Extracted app bundle: `dist/deckforge-macos-dry-run/DeckForge.app`
- App bundle size: 1,052 KiB
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

## Project DB serialization guard

`src/lib/project-list-codec.ts` now passes serialized project lists through `redactSensitiveText` before writing project DB/localStorage text. `src/lib/project-list-codec.test.ts` proves a project prompt containing `OPENAI_API_KEY=sk-live-secret123`, `Bearer codex.session.secret`, `Authorization: Basic ...`, `Authorization: token ...`, `/Users/jake/.codex/auth.json`, quoted `CODEX_SESSION="..."`, serialized `"token":"..."`, `"access_token":"..."`, `"refreshToken":"..."`, `"id_token":"..."`, `"sessionToken":"..."`, or `"clientSecret":"..."` fields persists with those raw values removed and `[redacted]` markers in their place.

## Secret reference encoding guard

`src/lib/live-auth-secret-reference-encoding.test.ts` proves that a secret store cannot return a reversible base64, base64url, or hex-encoded image API key inside `LiveSecretReference.secretId`; those references fail with `LiveSecretReferenceError` before the UI or project persistence can treat them as safe secret references.

## Secret reference scope guard

`src/lib/live-auth-secret-reference-scope.test.ts` proves that a secret store cannot return a `LiveSecretReference` for a different service or account than the saved DeckForge image key request. Those references fail with `LiveSecretReferenceScopeError` before the UI or project persistence can treat them as the active image credential.

## Auth failure classification guard

`src/lib/live-auth-failure-classification.test.ts` proves that 401 expiry evidence stays `login_expired` even when the runtime reports it through provider message text or `login_expired` reason text instead of the original `session_expired` reason. It also proves that a 403 `verify your organization` provider message is classified as `organization_verification_required`, not generic insufficient permission.

## Remaining evidence before close

DF-205 should remain open until the missing Live evidence is produced:

- Fresh login manual QA from an unauthenticated account or clean macOS account.
- Logout/relogin QA that proves live jobs cancel and provider actions stay locked until login is restored.
- Packaged app image credential setup through the OS keychain or equivalent desktop secret store.

## 2026-06-21 Runtime Recheck

Current local runtime evidence:

- `codex --version`: `codex-cli 0.141.0`
- `codex login status`: `Logged in using ChatGPT`
- `codex app-server daemon version`: `status: "running"`, `cliVersion: "0.141.0"`, `appServerVersion: "0.141.0"`
- The production app-surface interview run completed live App Server structured turns through the authenticated ChatGPT session without exposing token material.

The logout/relogin acceptance item remains externally blocked. Running `codex logout` in this shared lane would remove the only active ChatGPT session, and non-interactive restoration requires user-controlled device auth or access-token input. No raw token or device-login credential was available to this worker, so logout/relogin QA must be performed by a human or clean-machine owner.
