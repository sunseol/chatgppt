# PRD: DF-063 Deck Consistency Checker

## Problem
DeckForge needs a machine-readable way to detect deck-wide visual drift before slide regeneration. Existing layout validation checks render health and margins, but it does not report palette/title/text/chart/decorative consistency or identify regeneration candidates.

## Scope
- Add a pure consistency checker over `LayoutPrototype` and `DesignSystem`.
- Detect safe-margin, title position, text-size proxy, chart placeholder, palette token, and decorative drift issues.
- Compute a design-system violation rate.
- Return slide-level style-drift/regeneration candidates.
- Evaluate whether the 10-slide target has 2 or fewer drift slides.

## Acceptance Criteria
- The report includes `violationRate`.
- Slides with style drift are listed as regeneration candidates.
- A 10-slide deck passes the drift target when drift slides are 2 or fewer.
- Unit tests cover passing and failing decks.

## Non-Goals
- No screenshot/pixel analysis.
- No OCR.
- No provider-backed regeneration in this ticket.

## Verification
- `bun test src/lib/deck-consistency-checker.test.ts`
- `bun run lint`
- `bun run verify`
