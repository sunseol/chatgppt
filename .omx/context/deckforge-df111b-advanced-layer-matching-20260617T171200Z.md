# DF-111B Advanced Layer Matching Context

Implement DF-111B from `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`.

Existing state:
- DF-111A composes MVP editable text/chart/source overlays from DOM metadata.
- DF-111D converts PNG2SVG-like visual regions into movable DeckForge region layers.
- DF-114 can render optional extension layers but the P0 safe path remains generated background plus editable overlays.

Implementation direction:
- Add a pure merge/scoring module.
- Preserve existing DOM-derived text/chart/source layers unchanged.
- Append accepted visual/image region layers as Level 3 editable objects with `png2svg.*` source ids.
- Treat OCR/text candidates as hints only; never replace Slide Spec/DOM text.
- Score oversegmented slides and fail if unusable slide rate exceeds 10%.

Verification:
- Unit tests for merge preservation, OCR hint priority, and oversegmentation benchmark.
- Run target tests, lint, and full verify.
