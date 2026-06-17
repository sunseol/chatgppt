# DF-069 Layout IR Schema And Renderer Contract Context

## Task Statement
Implement DF-069: define a Layout IR schema and deterministic renderer contract so layout generation does not produce arbitrary HTML/CSS.

## Desired Outcome
- Layout IR validates only approved component types from DF-070.
- Layout IR carries slots, layer roles, source ids, dataset ids, and bbox preferences.
- Arbitrary CSS, fonts, colors, JavaScript, external resources, and unknown keys are rejected by schema.
- Deterministic renderer converts Layout IR to the existing `LayoutPrototype` shape with traceable DOM layer ids.

## Known Facts / Evidence
- DF-070 added the restricted component catalog and mock layout now uses catalog component selection.
- Existing `LayoutPrototype` has `componentType`, `html`, and `domLayers`.
- Existing mock layout still constructs HTML directly; DF-069 should move that through a renderer contract.

## Constraints
- No full sandbox or image rendering in this ticket.
- No arbitrary style/CSS fields in Layout IR.
- No new dependencies.
- Keep new TypeScript files below 250 pure LOC.

## Unknowns / Open Questions
- Exact renderer sandbox details will be implemented in DF-072A/DF-073.

## Likely Codebase Touchpoints
- `src/lib/layout-ir.ts`
- `src/lib/layout-ir.test.ts`
- `src/lib/mock-ai.ts`
