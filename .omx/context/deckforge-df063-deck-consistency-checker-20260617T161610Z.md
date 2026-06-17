# DF-063 Deck Consistency Checker Context

## Task Statement
Implement DF-063 Deck Consistency Checker 1st pass from `docs/codex_ppt_ticket_breakdown.md`.

## Desired Outcome
- Produce a deterministic consistency report for a deck layout against an approved design system.
- Calculate the design-system violation rate.
- Mark style-drift slides as regeneration candidates.
- Evaluate the 10-slide target of 2 or fewer drift slides.

## Known Facts / Evidence
- `DesignSystem` already defines palette tokens, typography ranges, canvas safe margins, layout rules, component rules, and negative rules.
- `LayoutPrototype` provides slide-level DOM layer metadata with role and bounds.
- `validateLayoutArtifacts` already checks safe-margin breach rate for rendered artifacts but does not classify style drift or regeneration candidates.
- DF-067 verified Korean typography separately; DF-063 can focus on deck-wide consistency signals.

## Constraints
- Do not add dependencies.
- Keep checker pure and deterministic.
- Avoid editing existing large modules unless necessary.
- Keep new TS files at or below 200 pure LOC where practical.

## Unknowns / Open Questions
- Current DOM layer metadata has bounds and roles but no resolved color/font tokens, so the first pass must inspect what is available: HTML markers, role/bounds, layout density, and optional style tokens if present in HTML.

## Likely Codebase Touchpoints
- `src/lib/deck-consistency-checker.ts`
- `src/lib/deck-consistency-checker.test.ts`
