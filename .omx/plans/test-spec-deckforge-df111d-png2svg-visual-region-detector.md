# Test Spec: DF-111D PNG2SVG Visual Region Detector Port

## Unit Tests

- Panel, icon block, and photo-like region candidates convert to movable DeckForge layers.
- A candidate that materially overlaps editable text overlays is rejected and reported as text intrusion.
- Low confidence and missing expected regions produce benchmark issues.
- Every accepted layer preserves source id, original PNG path/hash, bounds, and confidence.

## Verification Commands

- `bun test src/lib/png2svg-visual-region-detector.test.ts`
- `bun run lint`
- `bun run verify`
