# DeckForge Internal Test Build

This folder contains the unsigned macOS internal test DMG generated from the
Tauri release build.

- File: `DeckForge_0.1.0_aarch64.dmg`
- SHA-256: `232d0fd67eed137ff8b048848823d95cd71f2c8cd044a07ba279defd0a934108`
- Built on: 2026-06-21

This build has only an ad-hoc local signature and is not notarized. Local
Gatekeeper assessment rejects the DMG with `no usable signature`, so it is for
internal validation only.

Lane F recheck on branch `jacobex/live-lane-release-gates` regenerated this DMG
from `bun run tauri:build`. No Developer ID signing identity or notarization
credentials were available locally.
