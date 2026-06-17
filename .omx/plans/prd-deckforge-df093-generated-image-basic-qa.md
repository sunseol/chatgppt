# PRD: DF-093 Generated Image Basic QA

## Problem

Generated images and composed slides must be checked before review. The app needs a basic deterministic QA report that catches wrong aspect ratio, unreadable overlay text, source-less numeric claims, and major layout structure mismatches.

## Requirements

- Validate final slide compositor output.
- Confirm 16:9 or 4:3 aspect ratio.
- Flag unreadable editable text layers.
- Fail source-less numeric overlay text.
- Estimate layout structure mismatch and fail when above 10%.

## Acceptance

- Source-less numbers fail validation.
- Layout structure mismatch above 10% fails validation.
- Aspect ratio mismatch fails validation.
- Valid benchmark composition passes.
