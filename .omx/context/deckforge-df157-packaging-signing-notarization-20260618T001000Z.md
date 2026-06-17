# DF-157 Packaging, Code Signing, Notarization Context

## Ticket

- Source: `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`
- Priority: P1
- Depends on: DF-001, DF-156
- Scope: Prepare macOS-first install package, code signing, notarization, and fallback internal distribution.

## Current-State Evidence

- No `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, or Tauri bundle exists in this worktree.
- The current executable surface is a TanStack/Vite build with `dist/client` and `dist/server`.
- DF-156 documented that Rust/Tauri inventory must be rerun when Tauri manifests exist.

## Implementation Decision

- Add `bun run package:dry-run`.
- Generate an unsigned `DeckForge.app` directory under `dist/deckforge-macos-dry-run`.
- Generate `dist/deckforge-macos-dry-run.tgz` for internal handoff.
- Document that this dry-run is not a notarized or final Tauri artifact; it is a packaging rehearsal proving build outputs can be assembled into a macOS app-bundle shape.
