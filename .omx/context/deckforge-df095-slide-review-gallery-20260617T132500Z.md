# DF-095 Slide Review Gallery Context

- Ticket: DF-095. Slide Review Gallery 구현
- PRD: §8.10
- Depends on: DF-096, DF-093
- Scope: review generated slides in gallery/presentation modes, approve slides, request regeneration, and block vectorization until review is approved.

## Implementation Notes

- Keep gate logic in a model file for deterministic tests.
- Panel should clearly show failed QA slides.
- Original-preserving partial edit remains disabled/experimental before DF-101.
