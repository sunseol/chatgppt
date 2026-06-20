# Production Clean Machine Runbook

Date: 2026-06-19

Scope: DF-245 internal production package and clean macOS account validation.

## Package inputs

- Internal unsigned archive: `dist/deckforge-macos-dry-run.tgz`.
- Internal archive SHA-256: `e80f2378b21a79b5e600e49840deb97e6159d249e4d45d50ad9f19699a6a680f`.
- Unsigned Tauri DMG: `release-artifacts/DeckForge_0.1.0_aarch64.dmg`.
- DMG SHA-256: `33cc5cb29e25aba266288546037bd5f5007f7696a6a65bfb4787bd1aa50b2f20`.

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

Previous local dry-run package scan on 2026-06-20 for PR branch `jacobex/live-issue-contracts` found no hits for mock provider ids, mock provider labels, mock stage function names, fixture paths, test files, bundled `auth.json` or `.codex` payload files, local absolute workspace paths, `.omx/`, `.playwright-mcp/`, long `Bearer` tokens, or OpenAI/Codex secret-like values in `dist/client`, `dist/server`, or `dist/deckforge-macos-dry-run/DeckForge.app`. The regenerated archive SHA-256 was `83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7`; it contained 17 app files, 26 archive members, was 284,517 bytes compressed, and the extracted dry-run app bundle was 1,052 KiB.

Latest lane dry-run package scan on 2026-06-21 for branch `jacobex/live-lane-release-qa` regenerated `dist/deckforge-macos-dry-run.tgz` with SHA-256 `a9d25b2840b2ae41b15db3ec7dace158748a467febd1643eb46a390028c97272`, 288,674 compressed bytes, 26 archive members, and a 1,076 KiB extracted dry-run app bundle. Direct package scans found 0 files matching mock provider ids, mock provider labels, `MOCK MODE`, mock stage function names, fixture paths, test files, local absolute workspace paths, `.omx/`, `.playwright-mcp/`, or long `Bearer` tokens. The broad `mock`, `fixture`, `.codex`, and `OPENAI_API_KEY` matches are expected production guard-code literals, redaction regex definitions, and sensitive-path guards, not bundled mock resources or credential values.

The broader scan does find expected guard-code literals and status copy: `mock_lineage_contamination`, `fixture_lineage_contamination`, `pending_reinforcement_request`, `summary_without_original`, `missing_provenance`, production messages that say mock stages are not run in production, and secret-redaction regex definitions such as `API_KEY_PATTERN`, `SECRET_ASSIGNMENT_PATTERN`, `.codex/auth.json`, and `Bearer` token redaction expressions. The `OPENAI_API_KEY` string appears only in redaction guard code, not as an assigned credential. Broad `sk-*` scans also match Tailwind/class-merge names such as `sk-image-linear-from-pos`. Those strings are release/research approval gate rejection reasons, redaction guards, sensitive-path guards, or CSS utility identifiers, not bundled mock resources or actual secrets.

Latest local native package build on 2026-06-21 ran `bun run tauri:build`, produced `src-tauri/target/release/bundle/macos/DeckForge.app` and `src-tauri/target/release/bundle/dmg/DeckForge_0.1.0_aarch64.dmg`, and copied the fresh DMG into `release-artifacts/`. The DMG is 1,833,569 bytes with SHA-256 `53428ab9cf805a85c41e775bc2107d9e58713e0b7234ede271c0ead9560f932b`; the built app bundle has 3 files and is 4,984 KiB. Direct native bundle scan and mounted DMG scan both found 0 configured OpenAI/Codex secret-like values and 0 mock/fixture/test/local-path contamination hits.

Signing state remains release-blocking: `codesign -dv --verbose=4` reports `Signature=adhoc` and `TeamIdentifier=not set`; `codesign --verify --deep --strict --verbose=4 src-tauri/target/release/bundle/macos/DeckForge.app` fails with `code has no resources but signature indicates they must be present`; `spctl --assess --type open --context context:primary-signature --verbose=4 release-artifacts/DeckForge_0.1.0_aarch64.dmg` rejects the DMG with `source=no usable signature`.

## Local evidence contract

`src/lib/production-packaging-evidence.ts` validates DF-245 packaging evidence before it can count toward release. Blocking issue codes:

- `missing_production_package`
- `missing_package_hash`
- `missing_native_macos_bundle`
- `missing_developer_id_signature`
- `missing_release_trust_evidence`
- `missing_notarization`
- `missing_gatekeeper_acceptance`
- `package_not_production_mode`
- `package_content_contaminated`
- `invalid_clean_machine_step`
- `duplicate_clean_machine_step`
- `missing_clean_machine_step`
- `missing_clean_machine_step_evidence`
- `missing_runtime_absence_remediation`
- `missing_clean_machine_runbook`

Package archive and native macOS bundle paths must be persisted non-synthetic, non-local evidence paths; `file://`, absolute developer-local, mock, fixture, test, or fake paths do not count as DF-245 package evidence. The clean-machine runbook must be the canonical `docs/production-clean-machine-runbook.md`; a separate or renamed markdown file that merely ends with the same filename does not count.

Native macOS release trust evidence must include a Developer ID team signature, a 10-character uppercase alphanumeric Apple TeamIdentifier, notarization, stapling, Gatekeeper acceptance, and a persisted non-synthetic, non-local `releaseTrustEvidencePath` JSON bundle whose path identifies a release-trust bundle containing the codesign, notarytool, stapler, and `spctl` assessment records. The path itself must carry the `release-trust`, `codesign`, `notarytool`, `stapler`, and `spctl` markers so a generic `macos-release-trust.json` claim cannot stand in for the full assessment bundle. Ad-hoc signatures, missing TeamIdentifier values, placeholder values such as `not set`, missing, generically named, or developer-local release-trust evidence bundles, unstapled notarization tickets, or rejected `spctl` assessments block DF-245.

The clean-machine checklist must include distinct evidence events for install, Codex login, image credential setup, project launch, and first live interview. Each step must cite its own persisted non-synthetic, non-local JSON evidence path whose path identifies that specific checklist step; for example, `codex_login` cannot point at `install-app.json`, and one shared evidence path that names every step cannot satisfy the whole checklist. Repeating one step, adding an unsupported runtime step name, listing step labels without persisted evidence paths, reusing another step's evidence path, or reusing one multi-step evidence path cannot inflate the completed step count or replace a missing clean-machine action.

## Clean account validation

1. Create or use a clean macOS user account.
2. Install Bun only for dry-run package testing. Final Tauri package should not require Bun.
3. Install Codex CLI and confirm `codex --version`.
4. Sign in through the official Codex login/session flow.
5. Configure Codex image auths in the approved secret store if required.
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
- separate Codex usage copy
- locked image generation
- no fixture PNG fallback

## Current result

Blocked for final production release. The local dry-run package scan and regenerated native DMG scan pass, but clean-machine Live execution, Developer ID signing, notarization, and Gatekeeper acceptance are not recorded.

## Current blocker evidence

2026-06-21 KST Release/Packaging lane recheck ran from the developer worktree `/Users/jake/chatgppt-lane-release-qa/deck-scribe-craft-07` as user `jake` on the current lane branch, so it is not clean-machine evidence. `bun run package:dry-run` regenerated the unsigned archive with SHA-256 `a9d25b2840b2ae41b15db3ec7dace158748a467febd1643eb46a390028c97272`. `bun run tauri:build` regenerated the native DMG, which was copied to `release-artifacts/DeckForge_0.1.0_aarch64.dmg` with SHA-256 `53428ab9cf805a85c41e775bc2107d9e58713e0b7234ede271c0ead9560f932b`; its committed `.sha256` file verifies. `codesign -dv --verbose=4 release-artifacts/DeckForge_0.1.0_aarch64.dmg` exits 1 with `code object is not signed at all`, `codesign --verify --deep --strict --verbose=4 src-tauri/target/release/bundle/macos/DeckForge.app` fails with `code has no resources but signature indicates they must be present`, and `spctl --assess --type open --context context:primary-signature --verbose=4 release-artifacts/DeckForge_0.1.0_aarch64.dmg` exits 3 with `rejected` and `source=no usable signature`. DF-245 remains blocked on a signed/notarized package, release-trust evidence, and clean macOS account install/login/image-credential/project-launch/live-interview evidence.

## 2026-06-21 Lane F Recheck

Lane F rechecked packaging from developer worktree `/Users/jake/chatgppt-lane-release-gates/deck-scribe-craft-07` on branch `jacobex/live-lane-release-gates`.

- Dry-run archive: `dist/deckforge-macos-dry-run.tgz`, SHA-256 `cec0077d117f8cc2d863db2075bbbd55cc812830e91233474a9f550ee6de427b`, 287,894 bytes, 17 app files.
- Native app binary: `src-tauri/target/release/bundle/macos/DeckForge.app/Contents/MacOS/deckforge`, SHA-256 `dc927cc199e6456cbe12d5be42b9471cead63dafec58d77a699fa2f9c85d2c21`.
- Internal DMG: `release-artifacts/DeckForge_0.1.0_aarch64.dmg`, SHA-256 `232d0fd67eed137ff8b048848823d95cd71f2c8cd044a07ba279defd0a934108`, 1,833,580 bytes.
- DMG checksum verification: `shasum -a 256 -c release-artifacts/DeckForge_0.1.0_aarch64.dmg.sha256` returned `OK`.
- Package scans of the dry-run app bundle, native `.app`, and mounted DMG found 0 fixed-string hits for mock provider ids, `MOCK MODE`, mock stage resource names, fixture/test paths, local workspace paths, `.omx`, `.playwright-mcp`, or assigned `OPENAI_API_KEY`; long `Bearer` token scans found 0 hits. Broad `sk-*` regex scans hit Tailwind/class-merge utility code and were not credential evidence.
- Best available isolated smoke used a temporary HOME and served `/` from the dry-run package on port 4179, returning a 12,596-byte HTML response. This does not satisfy clean-machine evidence because it was still run by developer user `jake` and the package is unsigned.
- Signing state: `security find-identity -v -p codesigning` found 0 valid identities; the app remains ad-hoc signed with `TeamIdentifier=not set`; `codesign --verify --deep --strict --verbose=4 src-tauri/target/release/bundle/macos/DeckForge.app` fails with `code has no resources but signature indicates they must be present`; `codesign -dv --verbose=4 release-artifacts/DeckForge_0.1.0_aarch64.dmg` reports `code object is not signed at all`; `xcrun notarytool history` returns `Must provide credentials`; `spctl --assess --type open --context context:primary-signature --verbose=4 release-artifacts/DeckForge_0.1.0_aarch64.dmg` rejects with `source=no usable signature`.

DF-245 remains open. Next evidence needed: Developer ID Application signing identity, notarization credentials, successful notarization/stapling, Gatekeeper acceptance, persisted release-trust JSON bundle, and clean macOS account install/Codex login/image credential/project launch/first live interview evidence.

## 2026-06-21 Lane I Recheck

Lane I rechecked packaging from developer worktree
`/Users/jake/chatgppt-lane-auth-release-qa/deck-scribe-craft-07` on branch
`jacobex/live-lane-auth-release-qa`. This is not clean-machine evidence.

- Initial `bun run package:dry-run` failed because dependencies were not
  installed: `/bin/bash: vite: command not found`.
- `bun install` restored dependencies from `bun.lock`, and a rerun of
  `bun run package:dry-run` passed.
- Dry-run archive: `dist/deckforge-macos-dry-run.tgz`, SHA-256
  `e80f2378b21a79b5e600e49840deb97e6159d249e4d45d50ad9f19699a6a680f`,
  288,577 bytes, 26 archive members, 17 app files, 1,072 KiB extracted app
  bundle.
- Direct dry-run scans found 0 fixed-string hits for mock provider ids,
  `MOCK MODE`, mock stage resource names, fixture/test paths, local workspace
  paths, `.omx`, `.playwright-mcp`, or `CODEX_SESSION=` assignments. Long
  `Bearer`, assigned `OPENAI_API_KEY`, OpenAI key-shaped value, bundled
  `auth.json`, and bundled `.codex` scans also returned 0 hits.
- `bun run tauri:build` passed and produced
  `src-tauri/target/release/bundle/macos/DeckForge.app` and
  `src-tauri/target/release/bundle/dmg/DeckForge_0.1.0_aarch64.dmg`.
- The fresh DMG was copied to
  `release-artifacts/DeckForge_0.1.0_aarch64.dmg`; `shasum -a 256 -c
  release-artifacts/DeckForge_0.1.0_aarch64.dmg.sha256` returned `OK` for
  SHA-256 `33cc5cb29e25aba266288546037bd5f5007f7696a6a65bfb4787bd1aa50b2f20`.
- Native app binary SHA-256:
  `ae4f2216b92e03254cf9522406d7fc9b9d66c374a428858c055af7dd2feb6fd7`.
- Native app bundle: 3 files, 4,984 KiB.
- Native app bundle scans found 0 fixed-string mock/fixture/test/local-path
  contamination hits, 0 long `Bearer` hits, 0 assigned `OPENAI_API_KEY` hits,
  0 OpenAI key-shaped hits, and 0 bundled `auth.json`/`.codex` payloads.
- `security find-identity -v -p codesigning` found 0 valid identities.
- `xcrun notarytool history` failed with `Must provide credentials`.
- `codesign -dv --verbose=4
  src-tauri/target/release/bundle/macos/DeckForge.app` reported
  `Signature=adhoc` and `TeamIdentifier=not set`.
- `codesign --verify --deep --strict --verbose=4
  src-tauri/target/release/bundle/macos/DeckForge.app` failed with
  `code has no resources but signature indicates they must be present`.
- `codesign -dv --verbose=4
  src-tauri/target/release/bundle/dmg/DeckForge_0.1.0_aarch64.dmg` failed
  with `code object is not signed at all`.
- `spctl --assess --type open --context context:primary-signature
  --verbose=4 src-tauri/target/release/bundle/dmg/DeckForge_0.1.0_aarch64.dmg`
  rejected the DMG with `source=no usable signature`.

DF-245 remains open. Lane I produced fresh package/hash/scan evidence, but no
Developer ID signature, notarization/stapling, Gatekeeper acceptance, persisted
release-trust assessment bundle, or clean macOS account install/login/image
credential/project-launch/live-interview evidence exists.
