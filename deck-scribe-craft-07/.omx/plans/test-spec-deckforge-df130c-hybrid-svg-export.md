# Test Spec: DF-130C Hybrid SVG Compatibility Export

## Regression Coverage

- `src/lib/project-export.test.ts`
  - Builds hybrid SVG files with locked visual background, editable overlays, extension region metadata, and passing similarity.
  - Verifies native and hybrid SVG files use independent source labels, paths, and manifest lists.

- `src/components/deck/ExportStage.integration.test.tsx`
  - Renders per-slide Hybrid SVG download actions.

- `src/lib/final-export-gate.test.ts`
  - Blocks export summaries with zero hybrid SVG files.

## Verification Commands

- `bun test src/lib/project-export.test.ts src/components/deck/ExportStage.integration.test.tsx src/lib/final-export-gate.test.ts`
- `bun run lint`
- `bun run verify`

