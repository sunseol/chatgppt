# Test Spec: DF-111C PNG2SVG Adapter Feasibility Spike

## Unit Tests

- A ten-slide PNG2SVG manifest with `ocrEngine: "none"` returns a ready report.
- Converted editable draft layers use `png2svg.text.*`, `png2svg.visual_region.*`, or `png2svg.raster_region.*` source ids.
- Vector and raster/visual regions convert to SVG extension region layers.
- Figma import/package presence blocks MVP adapter mode.
- Spike report contains fixture diff entries, no-OCR limitation, and DF-156 license handoff.

## Verification Commands

- `bun test src/lib/png2svg-adapter-spike.test.ts`
- `bun run lint`
- `bun run verify`
