# DF-094 Generated Deck Consistency Context

## Task Statement
Implement DF-094 Deck Consistency Checker 2nd pass from `docs/codex_ppt_ticket_breakdown.md`.

## Desired Outcome
- Evaluate generated deck style drift after image QA.
- Combine DF-063 layout consistency results with DF-093 generated slide QA.
- Mark style-drift slides as regeneration candidates.
- Calculate design-system violation rate and enforce the 10% target.
- Include an information-density variance signal.

## Known Facts / Evidence
- DF-063 provides `checkDeckConsistency` with slide-level regeneration candidates.
- DF-093 provides `GeneratedSlideQaReport` with source-less numbers, readability, and structure mismatch.
- Existing MVP scoring can consume fatal issues, but no generated-deck consistency benchmark exists yet.

## Constraints
- Pure deterministic module.
- No visual/OCR dependency.
- No new dependencies.
- Keep files below 250 pure LOC.

## Likely Codebase Touchpoints
- `src/lib/generated-deck-consistency.ts`
- `src/lib/generated-deck-consistency.test.ts`
