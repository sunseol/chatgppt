# DF-102 Revision Compare UI Context

Implement DF-102 from `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`.

Existing state:
- DF-101 exposes `SlideRevisionComparison` in `src/lib/slide-revision-generation.ts`.
- Deck UI panels use bordered `bg-paper` surfaces and `Button` with lucide icons.
- Current review stage has revision/regeneration controls, but no before/after comparison panel.

Implementation direction:
- Add a focused `RevisionComparePanel` component under `src/components/deck`.
- Render before and after slide descriptors with stable 16:9 preview areas.
- Render approve and re-revision actions.
- Surface requested changes and preservation checks, including unintended-change warnings.

Verification:
- Add a static integration test with `renderToStaticMarkup`.
- Run target tests, lint, full verify, and local browser smoke check for the app.
