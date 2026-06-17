# DF-074 DOM Layer Metadata And Bounds Context

## Task Statement
Implement DF-074: extract/preserve DOM layer metadata with canvas-space bounds from rendered Layout IR output.

## Desired Outcome
- Every rendered editable layer has id, role, editable, source ids, dataset ids, and bounds.
- Metadata omission count is zero for valid Layout IR.
- Bounds are stored in the Layout IR canvas coordinate system.
- Coordinate output is deterministic and snapshot-testable.

## Known Facts / Evidence
- DF-069 added `bboxPreference` on Layout IR layers.
- DF-073 local renderer returns per-slide DOM layer metadata.
- Current `LayoutPrototype.domLayers` contains only id, role, and editable.

## Constraints
- No live browser DOM measurement in this ticket.
- No new dependencies.
- Keep TypeScript files below 250 pure LOC.
- Preserve the existing `LayoutPrototype` shape compatibly by adding fields rather than replacing it.

## Unknowns / Open Questions
- Later browser-backed extraction can compare actual element boxes against these deterministic canvas-space bounds.

## Likely Codebase Touchpoints
- `src/lib/layout-ir.ts`
- `src/lib/layout-html-renderer.ts`
- `src/lib/deck-types.ts`
- `src/lib/dom-layer-metadata.test.ts`
