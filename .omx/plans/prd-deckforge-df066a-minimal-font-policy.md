# DF-066A PRD: Minimal Font Policy

## Goal

Define a Korean-safe default font fallback policy shared by preview, editor reconstruction, and SVG export.

## Acceptance Criteria

- HTML preview, editor reconstruction, and SVG export use the same fallback policy.
- Korean title/body/caption text remains readable.
- No unclear-license font file is bundled.

## Implementation Status

- `FONT_POLICY` defines sans, serif, mono, line-height, letter-spacing, and bundled font metadata.
- `SlidePreview` consumes `FONT_POLICY`.
- `text-layer-reconstruction` consumes `FONT_POLICY`.
- `editable-svg-renderer` writes reconstructed font families into SVG text layers.

## Non-Goals

- Local installed font detection.
- User-selectable font manager.
- PPTX font substitution tables.
