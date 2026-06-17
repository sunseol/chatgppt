# DF-066A Test Spec

## Unit/UI Tests

- `FONT_POLICY` includes Korean-safe fallback names and no remote URLs.
- Line-height thresholds and zero letter spacing are enforced.
- Slide preview renders Korean text with shared fallback families.
- Text reconstruction uses the shared policy.
- SVG renderer emits the reconstructed fallback family.

## Commands

- `bun test src/lib/font-policy.test.ts src/components/deck/SlidePreviewFontPolicy.test.tsx src/lib/text-layer-reconstruction.test.ts src/lib/editable-svg-renderer.test.ts`
- `bun run lint`
- `bun run verify`
