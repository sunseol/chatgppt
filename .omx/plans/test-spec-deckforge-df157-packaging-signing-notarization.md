# Test Spec: DF-157 Packaging, Code Signing, Notarization Prep

## Packaging Dry Run

- Given the current app, when `bun run package:dry-run` runs, then `bun run build` succeeds first.
- Then `dist/deckforge-macos-dry-run/DeckForge.app/Contents/Info.plist` exists.
- Then `dist/deckforge-macos-dry-run/DeckForge.app/Contents/MacOS/deckforge` exists.
- Then `dist/deckforge-macos-dry-run/DeckForge.app/Contents/Resources/client` and `Resources/server` exist.
- Then `dist/deckforge-macos-dry-run.tgz` exists.

## Documentation Review

- Signing requirements identify Apple Developer Program membership, Developer ID Application certificate, hardened runtime, entitlements, app identifier, and notarization credentials.
- Fallback path states how to run internal testing when notarization or signing is unavailable.
- The document explicitly states that current dry-run is unsigned and not a final Tauri artifact.
