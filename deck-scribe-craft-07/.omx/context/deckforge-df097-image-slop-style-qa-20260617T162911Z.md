# DF-097 Image Slop & Style Elevation QA Context

## Task Statement
Implement DF-097 Image Slop & Style Elevation QA from `docs/codex_ppt_ticket_breakdown.md`.

## Desired Outcome
- Detect AI slop candidates in generated slide outputs.
- Flag meaningless decoration, broken text, fake graphs, web UI rhythm, and design-system drift.
- Return a QA checklist and route failures to regeneration or revision actions.

## Known Facts / Evidence
- DF-093 provides generated slide QA for unreadable text, source-less numbers, and structure mismatch.
- DF-094 provides generated-deck consistency candidates and design violation rate.
- Final slide compositor output is SVG with editable layer metadata.

## Constraints
- Pure deterministic module.
- No OCR/pixel model dependency.
- Keep checks conservative and explainable.

## Likely Codebase Touchpoints
- `src/lib/image-slop-qa.ts`
- `src/lib/image-slop-qa.test.ts`
