# DF-157 Packaging, Code Signing, Notarization Prep

Date: 2026-06-18

## Current Packaging Status

The current worktree has no Tauri or Rust app bundle manifest:

- `Cargo.toml`: not present
- `Cargo.lock`: not present
- `tauri.conf.json`: not present

Therefore the current DF-157 package is an unsigned internal dry-run bundle, not the final Tauri desktop release package.

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
- Stable bundle identifier, currently reserved in dry-run form as `app.deckforge.internal.dryrun`.
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

- Add or restore the real Tauri v2 app manifest and Rust backend package.
- Rerun DF-156 dependency license review against the final `Cargo.lock`.
- Replace `app.deckforge.internal.dryrun` with the production bundle identifier.
- Define final entitlements and Tauri permission/capability files.
- Sign with a Developer ID Application certificate.
- Notarize and staple the final app.
- Validate Gatekeeper on a clean macOS machine.
