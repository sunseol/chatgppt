# Test Spec: DF-076 Layout Approval UI

## Unit/UI Tests
- Approval CTA copy matches the required Korean text exactly.
- Approval model allows approval only when validation report status is passed.
- Validation panel renders pass/fail status and key metrics.
- Layout thumbnails use generated PNG data URLs when available.

## Browser Smoke
- Generate/regenerate a layout, confirm thumbnails and validation status render, approval CTA text is exact, and console has no warnings/errors.

## Regression Checks
- `bun run lint`
- `bun run verify`
