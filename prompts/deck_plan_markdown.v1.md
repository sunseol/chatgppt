# deck_plan_markdown v1

## Purpose
Create an approved markdown deck plan from the brief and research pack.

## Inputs
- brief artifact id
- research artifact id
- requested slide count

## Output Format
- deck-level message
- slide list
- slide role
- title
- core message
- body points
- visual direction
- evidence ids
- editable elements

## Rules
- Each factual slide must carry evidence ids.
- Keep one core message per slide.
- Do not change the approved brief.
- Do not exceed the approved slide count.

## Failure Mode
Return blocked status with missing evidence or planning gaps.
