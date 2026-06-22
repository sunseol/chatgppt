# DeckForge Internal Test Build

This folder contains the unsigned macOS internal test DMG generated from the
Tauri release build.

- File: `DeckForge_0.1.0_aarch64.dmg`
- SHA-256: `33cc5cb29e25aba266288546037bd5f5007f7696a6a65bfb4787bd1aa50b2f20`
- Built on: 2026-06-21

This build has only an ad-hoc local signature and is not notarized. Local
Gatekeeper assessment rejects the DMG with `no usable signature`, so it is for
internal validation only.

Lane I recheck on branch `jacobex/live-lane-auth-release-qa` regenerated this
DMG from `bun run tauri:build`. No Developer ID signing identity or
notarization credentials were available locally. `spctl` rejects the DMG with
`source=no usable signature`.
