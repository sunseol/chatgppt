# Test Spec: DF-096 Final Slide Compositor

## Automated Tests

- Compositor snapshot test:
  - SVG starts with locked generated background image
  - editable title/body/source/chart layers render above background
  - export basis is `compositor`
- Korean text overlay visual QA:
  - Korean title/body text appears as SVG text, not as raster-only background
  - text overlay count includes title and body

## Manual Verification

- Run `bun run verify`.
