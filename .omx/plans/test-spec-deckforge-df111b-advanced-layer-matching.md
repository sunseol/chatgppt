# Test Spec: DF-111B Advanced Layer Matching

## Unit Tests

- Merge keeps existing DOM-derived text/chart layers unchanged and appends visual/image region layers.
- Added layers retain `png2svg.*` source ids and Level 3 quality.
- OCR hints never replace existing editable text.
- Benchmark scoring passes with one unusable slide out of ten and fails with two out of ten.

## Verification Commands

- `bun test src/lib/advanced-layer-matching.test.ts`
- `bun run lint`
- `bun run verify`
