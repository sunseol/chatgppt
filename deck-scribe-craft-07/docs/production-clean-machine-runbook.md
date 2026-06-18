# Production Clean Machine Runbook

Date: 2026-06-19

Scope: DF-245 internal production package and clean macOS account validation.

## Package inputs

- Internal unsigned archive: `dist/deckforge-macos-dry-run.tgz`.
- Internal archive SHA-256: `39274abf4bf0a164fd837ddaba8ea7fe2cb063550e523328c324f6e62eaa5adb`.
- Unsigned Tauri DMG: `release-artifacts/DeckForge_0.1.0_aarch64.dmg`.
- DMG SHA-256: `ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d`.

## Build commands

```sh
bun run verify
bun run package:dry-run
bun run tauri:build
```

## Package content scan

Before sharing any production candidate, scan the extracted app and DMG staging folder for:

- `mock-provider`, `providerId: "mock"`, `MOCK MODE`
- `mockBrief`, `mockResearch`, `mockPlan`, `mockDesign`, `mockLayout`, `mockSlides`, `mockLayers`
- `fixtures/`, `.test.ts`, `.test.tsx`
- `sk-`, `OPENAI_API_KEY`, `Bearer `
- local absolute workspace paths such as `/Users/`
- `.omx/`, `.playwright-mcp/`, root-level visual mock PNGs

Any hit in production resources blocks release unless it is part of documentation that clearly labels the build as internal only.

Latest local dry-run package scan on 2026-06-19 for PR branch `jacobex/live-issue-contracts` found no hits for mock provider ids, mock provider labels, mock stage function names, fixture paths, test files, OpenAI/Codex secret-like values, bundled `auth.json` or `.codex` payload files, local absolute workspace paths, `.omx/`, or `.playwright-mcp/` paths in `dist/client`, `dist/server`, or `dist/deckforge-macos-dry-run/DeckForge.app`. The regenerated archive SHA-256 is `39274abf4bf0a164fd837ddaba8ea7fe2cb063550e523328c324f6e62eaa5adb`; it contains 17 app files, is 279,124 bytes compressed, and the extracted dry-run app bundle is 1,028 KiB.

The broader scan does find expected guard-code literals and status copy: `mock_lineage_contamination`, `fixture_lineage_contamination`, `pending_reinforcement_request`, `summary_without_original`, `missing_provenance`, production messages that say mock stages are not run in production, and secret-redaction regex definitions such as `API_KEY_PATTERN`, `SECRET_ASSIGNMENT_PATTERN`, `.codex/auth.json`, and `Bearer` token redaction expressions. Broad `sk-*` scans also match Tailwind/class-merge names such as `sk-image-linear-from-pos`. Those strings are release/research approval gate rejection reasons, redaction guards, sensitive-path guards, or CSS utility identifiers, not bundled mock resources or actual secrets.

Latest local native package build on 2026-06-19 ran `bun run tauri:build`, produced `src-tauri/target/release/bundle/macos/DeckForge.app` and `release-artifacts/DeckForge_0.1.0_aarch64.dmg`, and copied the DMG into `release-artifacts/`. The DMG is 1,830,270 bytes with SHA-256 `ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d`; the built app bundle has 3 files and is 4,984 KiB. Direct native bundle scan and mounted DMG scan both found 0 OpenAI/Codex secret-like values and 0 mock/fixture/test/local-path contamination hits.

Signing state remains release-blocking: `codesign -dv --verbose=4` reports `Signature=adhoc` and `TeamIdentifier=not set`; `spctl --assess --type open --context context:primary-signature --verbose=4 release-artifacts/DeckForge_0.1.0_aarch64.dmg` rejects the DMG with `source=no usable signature`.

## Local evidence contract

`src/lib/production-packaging-evidence.ts` validates DF-245 packaging evidence before it can count toward release. Blocking issue codes:

- `missing_production_package`
- `missing_package_hash`
- `missing_native_macos_bundle`
- `package_not_production_mode`
- `package_content_contaminated`
- `missing_clean_machine_step`
- `missing_runtime_absence_remediation`
- `missing_clean_machine_runbook`

The clean-machine checklist must include install, Codex login, image credential setup, project launch, and first live interview.

## Clean account validation

1. Create or use a clean macOS user account.
2. Install Bun only for dry-run package testing. Final Tauri package should not require Bun.
3. Install Codex CLI and confirm `codex --version`.
4. Sign in through the official Codex login/session flow.
5. Configure image API credentials in the approved secret store if required.
6. Launch DeckForge.
7. Create a 5-slide project.
8. Confirm provider capability UI shows connected text provider and unlocked image provider.
9. Start live interview and verify a live provider provenance record is created.
10. Quit and relaunch the app, then reopen the same project.

## runtime absence remediation

If Codex runtime is missing, the app must show:

- runtime status `missing` or `unavailable`
- supported runtime range
- install or permission remediation
- locked live text actions
- no mock fallback in production mode

If image credentials are missing, the app must show:

- `Needs API Key`
- separate billing/API-key copy
- locked image generation
- no fixture PNG fallback

## Current result

Blocked for final production release. The local dry-run package scan and regenerated native DMG scan pass, but clean-machine Live execution, Developer ID signing, notarization, and Gatekeeper acceptance are not recorded.
