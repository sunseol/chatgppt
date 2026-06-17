# Test Spec: DF-063 Deck Consistency Checker

## Unit Tests
- Given a 10-slide layout that follows the design safe margins and has title/body/chart/source layers, when checked, then `violationRate` is 0, no regeneration candidates are returned, and the drift target passes.
- Given a 10-slide layout with 3 slides drifting on title position, safe margin, chart placeholder, palette token, and decorative role, when checked, then violation rate is above 0, those slides are regeneration candidates, and the 2-of-10 target fails.
- Given an unsupported palette token in HTML, when checked, then a palette issue is reported for that slide.

## Regression Targets
- Existing `layout-validation` safe margin tests remain unchanged.
- Existing `design-system` schema tests remain unchanged.
