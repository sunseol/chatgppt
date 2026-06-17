# DF-071 Layout IR Prompt Context

## Task Statement
Implement DF-071: create the prompt package that asks an AI provider to produce slide-by-slide Layout IR JSON from an approved Deck Plan and approved Design System.

## Desired Outcome
- Prompt output is constrained to the existing Layout IR schema.
- Prompt enumerates only approved component types, slot ids, layer roles, token refs, source ids, dataset ids, and editable flags.
- Prompt explicitly forbids arbitrary CSS, colors, fonts, JavaScript, inline events, and external resources.
- Candidate output can be parsed through `LayoutIRSchema` before any renderer sees it.
- Layout IR metadata marks layout output as a draft, not final design.

## Known Facts / Evidence
- DF-069 introduced `LayoutIRSchema`, `createLayoutIrFromPlan`, and deterministic rendering.
- DF-070 introduced the restricted component catalog.
- Existing prompt builders use small pure modules with snapshot-stable text output.

## Constraints
- No new dependencies.
- Keep TypeScript files below 250 pure LOC.
- Do not call a real AI provider in this ticket.
- Do not add arbitrary style/CSS surfaces to Layout IR.

## Unknowns / Open Questions
- Real provider invocation and retry policy are later Phase D tickets.

## Likely Codebase Touchpoints
- `src/lib/layout-ir-prompt.ts`
- `src/lib/layout-ir-prompt.test.ts`
- `src/lib/layout-ir.ts`
- `src/lib/layout-component-catalog.ts`
