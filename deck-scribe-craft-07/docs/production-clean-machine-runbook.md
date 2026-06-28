# Production Clean Machine Runbook

Date: 2026-06-23

Scope: DF-245 internal production package and clean macOS account validation.

## Package inputs

- Internal unsigned archive: `dist/deckforge-macos-dry-run.tgz`.
- Internal archive SHA-256: `f68bd2d52314ff8a2de13f3e3938b4a9530f87a48dd18c951ef933c6416bf2be`.
- Internal Tauri DMG: `release-artifacts/DeckForge_0.0.0.08_aarch64.dmg`.
- DMG SHA-256: `3a4fecc690112bebf98329ac86e7f9d70306214ee627693f4ce5be73ba09859f`.
- iCloud copy: `~/Library/Mobile Documents/com~apple~CloudDocs/DeckForge/DeckForge_0.0.0.08_aarch64.dmg`.

## Build commands

```sh
bun run verify
bun run qa:frontend
bun run package:dry-run
bun run tauri:build
bun run qa:package
```

`bun run tauri:build` sets `RUSTFLAGS=--remap-path-prefix $HOME=/deckforge-build`
so Rust panic/debug strings do not leak the local developer home directory into
the packaged binary.

## Package content scan

Before sharing any production candidate, scan the extracted app and DMG staging folder for:

- `mock-provider`, `providerId: "mock"`, `MOCK MODE`
- `mockBrief`, `mockResearch`, `mockPlan`, `mockDesign`, `mockLayout`, `mockSlides`, `mockLayers`
- `fixtures/`, `.test.ts`, `.test.tsx`
- `sk-`, `OPENAI_API_KEY`, `Bearer `
- local absolute workspace paths such as `/Users/`
- `.omx/`, `.playwright-mcp/`, root-level visual mock PNGs

Any hit in production resources blocks release unless it is part of documentation that clearly labels the build as internal only.

## Native DMG QA

Run `bun run qa:package` before sharing the current DMG. The command reads
`release-artifacts/BUILD_VERSION`, verifies the matching `.sha256` file, mounts
the DMG read-only, verifies `DeckForge.app` with
`codesign --verify --deep --strict --verbose=2`, lints `Info.plist`, scans the
bundle for local developer paths, dev URLs, obvious secret tokens, and local QA
artifact paths, then launches the app briefly from the mounted DMG and quits it.

The 2026-06-23 local package QA superseded `0.0.0.04` after strict codesign
found an app-bundle resource seal issue, then superseded `0.0.0.05` after the
binary scan found local Rust build paths. `0.0.0.07` was superseded because
strict codesign found the regenerated app bundle was still linker-signed without
sealed resources. `0.0.0.08` is ad-hoc signed for internal testing, passes
native package QA, and is still not notarized.

Latest local dry-run package scan on 2026-06-19 found no hits for mock provider ids, mock provider labels, mock stage function names, fixture paths, test files, concrete secret values, local absolute workspace paths, `.omx/`, or `.playwright-mcp/` paths in `dist/client`, `dist/server`, or `dist/deckforge-macos-dry-run/DeckForge.app`. The regenerated archive contains 17 app files, is 272 KB compressed, and the extracted dry-run app bundle is 1.0 MB.

The broader scan does find expected guard-code literals and status copy: `mock_lineage_contamination`, `fixture_lineage_contamination`, `pending_reinforcement_request`, `summary_without_original`, `missing_provenance`, production messages that say mock stages are not run in production, and secret-redaction regex definitions such as `API_KEY_PATTERN`, `SECRET_ASSIGNMENT_PATTERN`, and `Bearer` token redaction expressions. Those strings are release/research approval gate rejection reasons or redaction guards, not bundled mock resources or actual secrets.

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

Blocked for final production release. The local dry-run package scan and native
DMG QA pass for `0.0.0.08`, but clean-machine Live execution, Developer ID
signing, notarization, and Gatekeeper validation are not recorded.
