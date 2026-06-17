# DF-080 Frozen Deck Context Context

## Task Statement
Implement DF-080: create a locked Frozen Deck Context bundle from approved Brief, Research Pack, Deck Plan, Design System, and HTML Layout Prototype artifacts.

## Desired Outcome
- Bundle has `deckContextId`, `projectId`, approved artifact ids, stable hash, and `locked: true`.
- Bundle includes `layoutPrototypeId` and DOM layer metadata.
- Missing/unapproved upstream artifacts block bundle creation.
- Prompt/package consumers can reference one stable `deckContextId`.

## Known Facts / Evidence
- Approval logs record artifact ids and hashes per stage.
- Approved artifacts carry `approvedHash` once user approves each gate.
- DF-074 enriched layout DOM layer metadata.
- DF-076 gates layout approval before image generation.

## Constraints
- No worker/job orchestration in this ticket.
- No file writes in the artifact store yet.
- No new dependencies.
- Keep TypeScript files below 250 pure LOC.

## Unknowns / Open Questions
- DF-081 will split this deck-level context into per-slide context bundles.

## Likely Codebase Touchpoints
- `src/lib/deck-context.ts`
- `src/lib/deck-context.test.ts`
- `src/lib/deck-types.ts`
