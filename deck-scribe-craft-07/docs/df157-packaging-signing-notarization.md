# DF-157 Packaging, Code Signing, Notarization Prep

Date: 2026-06-19

## Current Packaging Status

The current worktree has a Tauri v2 desktop scaffold and Rust backend package:

- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`

The fallback `package:dry-run` artifact remains an unsigned internal bundle for quick packaging rehearsal. The final native release path is the Tauri bundle produced by `bun run tauri:build` after signing credentials and notarization are available.

## Desktop Build And Quality Commands

Run:

```sh
bun run quality
bun run tauri:build
```

The combined quality gate runs TypeScript typecheck/lint/tests plus Rust format, clippy, and tests against `src-tauri/Cargo.toml`.

Verified local unsigned Tauri outputs:

- `src-tauri/target/release/bundle/macos/DeckForge.app`
- `src-tauri/target/release/bundle/dmg/DeckForge_0.1.0_aarch64.dmg`
- copied internal DMG: `release-artifacts/DeckForge_0.1.0_aarch64.dmg`
- current internal DMG SHA-256: `ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d`

Latest local native package scan on 2026-06-19 found 0 OpenAI/Codex secret-like values and 0 mock/fixture/test/local-path contamination hits in both the built app bundle and a mounted copy of the DMG.

Latest local signing assessment:

- `codesign -dv --verbose=4 src-tauri/target/release/bundle/macos/DeckForge.app` reports `Signature=adhoc` and `TeamIdentifier=not set`.
- `spctl --assess --type open --context context:primary-signature --verbose=4 release-artifacts/DeckForge_0.1.0_aarch64.dmg` rejects the DMG with `source=no usable signature`.

## Internal Dry-Run Command

Run:

```sh
bun run package:dry-run
```

Expected outputs:

- `dist/deckforge-macos-dry-run/DeckForge.app`
- `dist/deckforge-macos-dry-run/DeckForge.app/Contents/Info.plist`
- `dist/deckforge-macos-dry-run/DeckForge.app/Contents/MacOS/deckforge`
- `dist/deckforge-macos-dry-run/DeckForge.app/Contents/Resources/client`
- `dist/deckforge-macos-dry-run/DeckForge.app/Contents/Resources/server`
- `dist/deckforge-macos-dry-run.tgz`

The launcher requires Bun on the internal test machine and starts the current TanStack server build. This is sufficient for packaging rehearsal and handoff shape validation, but it is not a notarized macOS release.

## Code Signing Requirements

Production macOS signing requires:

- Apple Developer Program team membership.
- Developer ID Application certificate installed in the signing keychain.
- Stable bundle identifier, currently `app.deckforge.desktop` in `src-tauri/tauri.conf.json`.
- Hardened runtime enabled in the final native packaging toolchain.
- Explicit entitlements for only required capabilities.
- Third-party license notices from DF-156 included in the distribution package.
- Secret-free build logs and package metadata.

Expected release signing command shape once a final app bundle exists:

```sh
codesign --force --deep --options runtime --timestamp \
  --sign "Developer ID Application: <TEAM NAME> (<TEAM ID>)" \
  "DeckForge.app"
codesign --verify --deep --strict --verbose=2 "DeckForge.app"
spctl --assess --type execute --verbose=4 "DeckForge.app"
```

## Notarization Requirements

Production notarization requires:

- Apple ID or App Store Connect API key with notarization permissions.
- Signed app archive, typically `.zip` or `.dmg`.
- `xcrun notarytool submit ... --wait` success.
- Stapling with `xcrun stapler staple`.
- Gatekeeper validation on a clean macOS machine.

Expected release notarization command shape:

```sh
ditto -c -k --keepParent "DeckForge.app" "DeckForge.zip"
xcrun notarytool submit "DeckForge.zip" \
  --apple-id "<APPLE_ID>" \
  --team-id "<TEAM_ID>" \
  --password "<APP_SPECIFIC_PASSWORD>" \
  --wait
xcrun stapler staple "DeckForge.app"
spctl --assess --type execute --verbose=4 "DeckForge.app"
```

## Fallback Test Path

If signing, notarization, or final Tauri packaging is unavailable:

1. Run `bun run verify`.
2. Run `bun run package:dry-run`.
3. Share `dist/deckforge-macos-dry-run.tgz` only as an internal unsigned dry-run package.
4. On the test machine, install Bun first.
5. Extract the archive and run `DeckForge.app/Contents/MacOS/deckforge` directly from Terminal.

Do not present the fallback package as a signed release. It is for internal validation only.

## Release Blockers Before Public Distribution

- Rerun DF-156 dependency license review against the final `src-tauri/Cargo.lock`.
- Confirm `app.deckforge.desktop` is the production bundle identifier before public distribution.
- Define final entitlements beyond the current empty default Tauri capability, if the app needs native permissions.
- Sign with a Developer ID Application certificate.
- Notarize and staple the final app.
- Validate Gatekeeper on a clean macOS machine.
