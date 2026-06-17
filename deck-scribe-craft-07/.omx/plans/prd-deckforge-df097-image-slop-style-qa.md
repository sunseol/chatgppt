# PRD: DF-097 Image Slop & Style Elevation QA

## Problem
Generated slides can pass mechanical checks while still looking like low-quality AI output: decorative noise, fake charts, broken text, web-dashboard rhythm, or design-system drift.

## Scope
- Add a deterministic image slop QA checklist.
- Evaluate final composition SVG plus generated slide QA and generated deck consistency signals.
- Return failed checklist items, candidate labels, and recommended action.

## Acceptance Criteria
- AI slop candidates are marked automatically or by checklist item.
- HTML preview/web UI replication is a failure candidate.
- Failures connect to regeneration or revision actions.

## Verification
- `bun test src/lib/image-slop-qa.test.ts src/lib/generated-deck-consistency.test.ts src/lib/generated-slide-qa.test.ts`
- `bun run lint`
- `bun run verify`
