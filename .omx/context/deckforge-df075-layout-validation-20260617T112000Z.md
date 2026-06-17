# DF-075 Layout Validation Context

## Task Statement
Implement DF-075: validate local layout render artifacts for render success, overflow, safe margin compliance, role separation, and density consistency.

## Desired Outcome
- Layout validation returns a deterministic report.
- Render success rate is measured and must be 100%.
- Overflow slide rate is calculated and must be at most 5%.
- Safe margin breach rate is calculated and must be at most 5%.
- Report issues identify slide number, code, and message for UI display.

## Known Facts / Evidence
- DF-073 creates local render artifacts with canvas metadata.
- DF-074 enriches DOM layers with canvas-space bounds.
- Valid mock layouts currently produce zero metadata omissions and in-bounds layers.

## Constraints
- No live browser layout measurement in this ticket.
- No new dependencies.
- Keep TypeScript files below 250 pure LOC.
- Approval UI is a later DF-076 ticket.

## Unknowns / Open Questions
- Future browser-backed validators can add actual text overflow measurement; this ticket uses deterministic layer bounds as the minimum validation surface.

## Likely Codebase Touchpoints
- `src/lib/layout-validation.ts`
- `src/lib/layout-validation.test.ts`
