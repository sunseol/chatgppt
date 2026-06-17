# DF-081 Slide Context Bundle Context

## Task Statement
Implement DF-081: create per-slide context bundles for parallel slide generation from a Frozen Deck Context and approved project artifacts.

## Desired Outcome
- Each slide bundle references the same deck context id/hash.
- Bundle includes global summary, design tokens, layout screenshot reference, DOM layers, slide spec, facts, and source map.
- Bundle excludes original conversation history and unapproved prompt text.
- Output is deterministic and snapshot-testable.

## Known Facts / Evidence
- DF-080 creates a locked Frozen Deck Context.
- Existing minimal slide source map links slide specs to claim/source/dataset ids.
- Layout prototype slides now include DOM layer metadata and PNG thumbnails.

## Constraints
- No real parallel worker orchestration in this ticket.
- No provider call.
- No new dependencies.
- Keep TypeScript files below 250 pure LOC.

## Unknowns / Open Questions
- DF-082/DF-090 will decide prompt asset versioning and real generation prompt shape.

## Likely Codebase Touchpoints
- `src/lib/slide-context-bundle.ts`
- `src/lib/slide-context-bundle.test.ts`
