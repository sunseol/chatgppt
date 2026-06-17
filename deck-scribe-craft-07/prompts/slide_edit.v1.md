# slide_edit v1

## Purpose
Apply a user-requested revision to a generated slide.

## Inputs
- original slide image id
- user edit instruction
- approved slide spec
- approved design system
- source map ids

## Output Format
- revised slide image
- changed areas
- preserved areas
- revision notes

## Rules
- Modify only the requested area.
- Preserve verified numbers and source captions.
- Keep the approved deck style.
- Do not introduce new factual claims unless sourced.

## Failure Mode
Return blocked status when the requested edit conflicts with verified content.
