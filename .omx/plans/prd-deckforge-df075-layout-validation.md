# PRD: DF-075 Layout Validation

## Problem
Layout artifacts need a machine-readable validation report before approval. The app can render layout prototypes, but it does not yet measure whether all slides rendered, whether layer bounds fit the canvas, or whether safe margins are respected.

## Scope
- Validate local layout render artifacts.
- Measure render success rate.
- Measure overflow slide rate.
- Measure safe margin breach rate.
- Report role/density warnings for missing title/body/source separation where applicable.
- Provide deterministic benchmark report output.

## Acceptance Criteria
- HTML rendering success rate is measured at 100% for valid artifacts.
- Overflow slide rate is calculated and must be <= 5%.
- Safe margin breach rate is calculated and must be <= 5%.
- Validation report includes slide-level issues suitable for later UI display.

## Non-Goals
- Layout approval UI.
- Browser-measured text overflow.
- Auto-repair.
