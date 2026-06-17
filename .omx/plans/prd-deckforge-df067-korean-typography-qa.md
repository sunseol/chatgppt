# PRD: DF-067 Korean Typography QA

## Problem
Deck output can pass font fallback checks while still failing Korean readability through broken glyphs, too-small captions, unsafe line-height, or unreadable mixed Korean/English/number strings.

## Scope
- Add a deterministic Korean typography benchmark function.
- Evaluate reconstructed text layers by role.
- Report corruption, minimum font size, minimum line-height, zero letter spacing, mixed text coverage, and source caption readability.

## Acceptance Criteria
- Replacement-character corruption count must be zero.
- Title/body/caption/source/number text must meet minimum size and line-height thresholds.
- Korean/English/number mixed strings must be represented by readable text layers.
- Source captions must be non-empty and readable.
- The report exposes issue codes and failing layer ids for downstream QA.

## Non-Goals
- No remote font loading.
- No bundled proprietary fonts.
- No OCR or visual-diff dependency.

## Verification
- `bun test src/lib/korean-typography-qa.test.ts src/lib/text-layer-reconstruction.test.ts src/lib/font-manager.test.ts src/lib/font-policy.test.ts`
- `bun run lint`
- `bun run verify`
