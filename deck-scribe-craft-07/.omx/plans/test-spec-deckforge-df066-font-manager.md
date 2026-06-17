# DF-066 Test Spec

## Unit Tests

- Detect available known Korean fonts from a supplied local font list.
- Build surface mappings for preview, editor, SVG export, and PPTX export.
- Validate that title/body/caption mappings remain consistent across surfaces.
- Confirm no bundled font files are introduced.

## Regression Tests

- Slide preview uses shared fallback policy.
- Text reconstruction uses shared fallback policy.
- SVG renderer emits the same family policy.

## Visual QA

- Open a Korean sample deck surface and confirm no horizontal overflow or missing Korean text.

## Commands

- `bun test src/lib/font-manager.test.ts src/lib/font-policy.test.ts src/components/deck/SlidePreviewFontPolicy.test.tsx src/lib/text-layer-reconstruction.test.ts src/lib/editable-svg-renderer.test.ts`
- `bun run lint`
- `bun run verify`
