# PRD: DF-094 Generated Deck Consistency Checker

## Problem
DF-063 checks layout/design drift before generation, and DF-093 checks individual generated slides. The generated deck still needs a deck-level benchmark that marks regeneration candidates and calculates whether style/design drift stays within the 10% target.

## Scope
- Add a generated deck consistency evaluator.
- Merge layout consistency candidates and generated slide QA failures.
- Add information-density variance from per-slide layer counts.
- Return candidate slide numbers and reasons.
- Compute `designViolationRate` and `targetPassed`.

## Acceptance Criteria
- Major style-drift slides are regeneration candidates.
- Design-system violation rate target is 10% or lower.
- Density outliers are captured as consistency issues.

## Verification
- `bun test src/lib/generated-deck-consistency.test.ts src/lib/deck-consistency-checker.test.ts src/lib/generated-slide-qa.test.ts`
- `bun run lint`
- `bun run verify`
