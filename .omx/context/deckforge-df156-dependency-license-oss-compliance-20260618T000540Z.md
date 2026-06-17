# DF-156 Dependency License / OSS Compliance Context

## Ticket
- Source: `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`
- Priority: P1
- Depends on: DF-003
- Scope: Review Rust/TypeScript dependencies, fonts, rendering tools, export tools, and the `sunseol/PNG2SVG.git` adapter candidate for license and distribution risks.

## Current-State Evidence
- `package.json` and `bun.lock` exist.
- No `Cargo.toml`, `Cargo.lock`, or `tauri.conf.json` exists in this worktree, so the current Rust/Tauri dependency inventory is empty.
- `src/lib/font-policy.ts` has `bundledFontFiles: []` and system/Korean-safe fallback font stacks.
- `src/routes/__root.tsx` still links Google Fonts for the app shell. This is not a bundled font file, but it is an external runtime/network dependency to keep out of export paths.
- `sunseol/PNG2SVG` exists at Git HEAD `21c8633a7cc318061f5f6b4875a7cdc51f325bd2`, has GitHub API `license: null`, and `LICENSE` returns 404.

## Decision
- Produce a report under `docs/df156-license-oss-compliance.md`.
- Treat PNG2SVG as an unlicensed candidate: allowed for reference/spike review only, not for direct merge or bundled MVP distribution.
- Keep Figma plugin code out of the MVP bundle; Post-MVP Figma compatibility can revisit only after license provenance is resolved.

