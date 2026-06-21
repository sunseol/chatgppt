# Live Auth Secret Lifecycle

Date: 2026-06-19

Scope: DF-205 / GitHub issue `#131`, Live authentication and secret lifecycle.

## Acceptance contract

| Requirement                                                                     | Local contract                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official Codex runtime login/session flow                                       | Local runtime check uses `codex-cli 0.141.0`; `codex login status` returned `Logged in using ChatGPT` without exposing token material.                                                                                                                                                                  |
| Do not copy raw ChatGPT/Codex access tokens into project DB                     | `serializeProjectList` redacts raw API keys, bare or quoted `CODEX_SESSION=...` values, serialized secret fields such as `"token":"..."`, `"access_token":"..."`, `"refreshToken":"..."`, `"id_token":"..."`, `"sessionToken":"..."`, and `"clientSecret":"..."`, Bearer/Basic/token Authorization credentials, and `.codex/auth.json` paths before local project DB serialization. Project persistence continues to store provider provenance and references only. Package scans below found no `auth.json` file, `.codex` directory payload, `CODEX_SESSION=...`, long Bearer token, or OpenAI key-shaped value in production assets. |
| Store image API keys only through the OS keychain bridge                        | `connectImageApiKeySecret` accepts an injected `LiveSecretStore`, writes the trimmed secret through `saveSecret`, rejects non-`os_keychain` stores including `equivalent_secret_store`, rejects secret references that echo raw, URL-encoded, base64, base64url, or hex key material, rejects any returned unsupported store kind or store-kind mismatch, rejects references with the wrong service or account scope, rejects drifted created timestamp evidence, and returns only a `LiveSecretReference` plus public label. `disconnectImageApiKeySecret` rejects store-kind mismatch before delete, deletes the stored key through `deleteSecret`, and returns a missing-credential state without returning the secret reference. |
| Distinguish login expiry, 401, permission, and organization verification states | `classifyLiveAuthFailure` normalizes provider reason/message evidence and maps `session_expired`, `login_expired`, and `Session expired` 401 failures separately from generic 401 unauthorized failures. It also keeps 403 organization-verification evidence, including `verify your organization` messages, separate from generic insufficient-permission failures. |
| Logout cancels related live jobs and locks UI                                   | `cancelLiveJobsForAuthLogout` requests cancellation for active live jobs, and `createLiveAuthLogoutLockState` returns `uiLocked: true` with `requiresAuth` provider statuses.                                                                                                                           |

## Codex OAuth image route guard

The product production route is Codex OAuth image generation, not OpenAI API-key image generation. `decideImageProviderFeasibility` selects `codex` / `codexOAuth` and records `openaiApiKey` as an excluded route. `createProductionImageGenerationGate` now also rejects an old persisted locked `openaiImage` / `openaiApiKey` decision with `production_codex_oauth_required`, so a project reload cannot turn legacy API-key image evidence into a production-ready generation route.

The `connectImageApiKeySecret` secret-store contract remains as a defensive legacy/fallback guard: if a non-production or compatibility path ever stores a key, it must use the injected OS keychain store and must not leak raw, encoded, wrong-scope, stale, or non-keychain secret references. It is not the production image-generation direction.

`src/lib/live-auth-keychain-store.test.ts` covers the local false-ready case where an `equivalent_secret_store` adapter previously made an image credential look stored without the packaged OS keychain bridge.

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
- SHA-256: `a9d25b2840b2ae41b15db3ec7dace158748a467febd1643eb46a390028c97272`
- Archive size: 288,674 bytes
- Extracted app bundle: `dist/deckforge-macos-dry-run/DeckForge.app`
- App bundle size: 1,076 KiB
- App bundle files: 17

Lane F package secret recheck on branch `jacobex/live-lane-release-gates` regenerated `dist/deckforge-macos-dry-run.tgz` with SHA-256 `cec0077d117f8cc2d863db2075bbbd55cc812830e91233474a9f550ee6de427b`. Fixed-string scans of the dry-run app bundle, native `.app`, and mounted DMG found 0 assigned `OPENAI_API_KEY`, long `Bearer` token, local workspace path, `.omx`, or `.playwright-mcp` hits. Broad `sk-*` regex matches were Tailwind/class-merge utility code, not credential evidence.
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

## Secret reference timestamp guard

`src/lib/live-auth-secret-reference-timestamp.test.ts` proves that a secret store cannot return a `LiveSecretReference.createdAt` value that drifts from the save request timestamp. Those references fail with `LiveSecretReferenceTimestampError` before the UI or project persistence can treat them as the current image credential.

## Auth failure classification guard

`src/lib/live-auth-failure-classification.test.ts` proves that 401 expiry evidence stays `login_expired` even when the runtime reports it through provider message text or `login_expired` reason text instead of the original `session_expired` reason. It also proves that a 403 `verify your organization` provider message is classified as `organization_verification_required`, not generic insufficient permission.

## Remaining evidence before close

DF-205 should remain open until the missing Live evidence is produced:

- Fresh login manual QA from an unauthenticated account or clean macOS account.
- Logout/relogin QA that proves live jobs cancel and provider actions stay locked until login is restored.
- Packaged app Codex OAuth image capability confirmation, plus packaged OS keychain lifecycle proof if an API-key fallback remains installed outside the production route.

## 2026-06-21 Runtime Recheck

Current local runtime evidence:

- `codex --version`: `codex-cli 0.141.0`
- `codex login status`: `Logged in using ChatGPT`
- `codex app-server daemon version`: `status: "running"`, `cliVersion: "0.141.0"`, `appServerVersion: "0.141.0"`
- The production app-surface interview run completed live App Server structured turns through the authenticated ChatGPT session without exposing token material.

The logout/relogin acceptance item remains externally blocked. Running `codex logout` in this shared lane would remove the only active ChatGPT session, and non-interactive restoration requires user-controlled device auth or access-token input. No raw token or device-login credential was available to this worker, so logout/relogin QA must be performed by a human or clean-machine owner.

## 2026-06-21 Lane A Evidence Recheck

Fresh authenticated App Server evidence was collected at `2026-06-20T19:29:29Z`
(`2026-06-21 04:29:29 KST`) and preserved in
`docs/live-evidence/runtime-text-research-live-recheck-20260620T192929Z.json`.

- Evidence digest:
  `sha256:c3fe5790996607ff06ffbac3422c9e2f751b2a855d304a2c8775fe09fa082a3f`
- `codex --version`: `codex-cli 0.141.0`
- `codex app-server daemon version`: `status: "running"`,
  `cliVersion: "0.141.0"`, `appServerVersion: "0.141.0"`
- Authenticated smoke thread/turn:
  `019ee682-75f6-7f63-a741-9ea51e0beba6` /
  `019ee682-7888-74a0-a5e1-29223ff1dcbb`
- Schema-constrained live structured thread/turn:
  `019ee682-8819-74f3-8f5a-8e5864e54db1` /
  `019ee682-8ab0-79d0-9068-b37e428faf04`

This recheck proves the current lane can use the official authenticated Codex
runtime without storing token material in the project. It does not close
DF-205 because fresh unauthenticated login, logout/relogin, and packaged
desktop keychain setup require a user-controlled clean account or clean machine.

## 2026-06-21 Lane E Auth Evidence

Fresh Lane E auth/bootstrap evidence is stored at
`docs/live-evidence/lane-e-20260621/auth-bootstrap-smoke.json` with SHA-256
`4803348fa684e1eaeb6662be04d7877e180ce8178340db2d92049e2d1a465dff`.

- Account type: `chatgpt`
- Smoke thread: `019ee6ab-9437-7520-9e6f-5bdd58b6bd41`
- Smoke turn: `019ee6ab-96a4-7270-b6e9-829d5415721`
- Protocol frames: 86 stdout protocol frames, 40 stderr log lines
- Completed event: `turn/completed`

DF-205 remains open. This run intentionally did not execute `codex logout`
against the shared worker session, and no clean macOS account, device-login
handoff, or packaged app secret-store/keychain lifecycle was available. The next
evidence needed is an isolated clean-machine sequence covering first login,
logout, live job lock/cancel state while logged out, relogin, post-relogin App
Server smoke, packaged secret-store write/read/delete, and a persisted secret
leak scan.

## 2026-06-21 Lane I Non-Destructive Auth Recheck

Lane I rechecked only non-destructive auth evidence from developer worktree
`/Users/jake/chatgppt-lane-auth-release-qa/deck-scribe-craft-07`.

- `codex --version`: `codex-cli 0.141.0`
- `codex login status`: `Logged in using ChatGPT`
- `codex app-server daemon version`: `status: "running"`,
  `managedCodexVersion: "0.141.0"`, `cliVersion: "0.141.0"`,
  `appServerVersion: "0.141.0"`
- Fresh dry-run package SHA-256:
  `e80f2378b21a79b5e600e49840deb97e6159d249e4d45d50ad9f19699a6a680f`
- Fresh dry-run package scans over `dist/client`, `dist/server`, and
  `dist/deckforge-macos-dry-run/DeckForge.app` found 0 bundled
  `auth.json`/`.codex` payloads, 0 `CODEX_SESSION=` assignments, 0 long
  `Bearer` tokens, 0 assigned `OPENAI_API_KEY` values, and 0 OpenAI key-shaped
  values.

DF-205 remains open. Lane I did not run `codex logout` because that would
destroy the shared authenticated ChatGPT session, and no disposable clean
account, device-login handoff, or packaged keychain lifecycle environment was
available.
