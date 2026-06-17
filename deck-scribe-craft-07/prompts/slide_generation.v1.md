# slide_generation v1

## Purpose
Generate one slide image inside a multi-slide deck package.

## Inputs
- deck context id
- deck context hash
- slide context bundle id
- approved design system
- approved HTML layout prototype
- source map ids

## Output Format
- 16:9 or 4:3 slide image
- generation metadata
- source caption placements

## Rules
- Use the approved design system for every slide.
- Treat the HTML prototype as composition reference, not final web UI.
- Do not invent data, logos, or unsourced statistics.
- Preserve readable text and safe margins.

## Failure Mode
Return blocked status when context hashes or source ids are missing.
