# DF-115 Editable Review Gate Context

## Task Statement
Implement an editable review gate so users must review and approve SVG/layer conversion results before moving to editor/export.

## Desired Outcome
- Editable layer approval is blocked when validation fails.
- Editability metrics and validation failures are visible.
- Regeneration remains available when conversion output is not acceptable.

## Known Facts / Evidence
- `VectorizeStage` currently creates mock editable layers and can move directly to `EDITOR` when layers exist.
- `GateBar` supports disabled approval actions.
- `EditableLayerModel` in `deck-types.ts` contains slide number, layers, type, role, bounds, and editable flag.

## Constraints
- Do not widen the UI beyond the vectorize/review gate scope.
- Keep failures visible; do not hide blocked reasons behind console or logs.
- TypeScript/TSX edits must stay strict and under OMO size limits.

## Unknowns / Open Questions
- Rich SVG structural validation will be expanded by later export tickets.
- This ticket can use current editable layer metadata as the validation input.

## Likely Codebase Touchpoints
- `src/components/deck/VectorizeStage.tsx`
- New `src/lib/editable-review-gate.ts`
- New `src/components/deck/EditableReviewGatePanel.tsx`
- New model and UI tests.
