# DF-066A Minimal Font Policy Context

## Ticket

- DF-066A. Minimal Font Policy

## Existing Surface

- `src/lib/font-policy.ts` defines shared Korean-safe sans/serif/mono fallback stacks.
- `FONT_POLICY` includes line-height values and zero letter spacing.
- `bundledFontFiles` is empty, so no unclear-license font files are bundled.
- `SlidePreview`, `text-layer-reconstruction`, and `editable-svg-renderer` use the shared policy.

## Decision

No source change is required for DF-066A. Existing implementation and tests satisfy the minimal policy.

## Verification

- `bun test src/lib/font-policy.test.ts src/components/deck/SlidePreviewFontPolicy.test.tsx src/lib/text-layer-reconstruction.test.ts src/lib/editable-svg-renderer.test.ts`
- `bun run lint`
- `bun run verify`
