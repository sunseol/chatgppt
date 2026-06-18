# Production Clean Machine Runbook

Date: 2026-06-19

Scope: DF-245 internal production package and clean macOS account validation.

## Package inputs

- Internal unsigned archive: `dist/deckforge-macos-dry-run.tgz`.
- Internal archive SHA-256: `1746e13e33cba8c87d2a8ddcb7bb1e0a0898bc43e3cf65787bdab2282401c161`.
- Unsigned Tauri DMG: `release-artifacts/DeckForge_0.1.0_aarch64.dmg`.
- DMG SHA-256: `dce2ba0c8a3b26a21fed1f4692e635e7d0feb39624eb96ba6b7bf87f41879a1f`.

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

Latest local dry-run package scan on 2026-06-19 for PR branch `jacobex/live-issue-contracts` found no hits for mock provider ids, mock provider labels, mock stage function names, fixture paths, test files, concrete secret values, local absolute workspace paths, `.omx/`, or `.playwright-mcp/` paths in `dist/client`, `dist/server`, or `dist/deckforge-macos-dry-run/DeckForge.app`. The regenerated archive contains 17 app files, is 272 KB compressed, and the extracted dry-run app bundle is 1.0 MB.

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

Blocked for final production release. The local dry-run package scan passes, but clean-machine Live execution, signing, notarization, and Gatekeeper validation are not recorded.
