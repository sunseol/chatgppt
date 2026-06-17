# Test Spec: DF-114 SVG Renderer

## Automated Tests

- SVG render snapshot test:
  - renders locked background separately
  - renders text with reconstructed fonts and editable layer ids
  - renders chart/shape/image layers as separate SVG groups
  - renders optional vector/image extension regions
- Visual similarity check:
  - returns pass when the rendered layer count matches the source model and delta <= 10%

## Manual Verification

- Run `bun run verify`.
