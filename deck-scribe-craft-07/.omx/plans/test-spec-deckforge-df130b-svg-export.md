# Test Spec: DF-130B Native SVG Export

## Regression Coverage

- `src/lib/project-export.test.ts`
  - Builds SVG files from approved layout PNGs and editable layer models.
  - Verifies SVG metadata, hash, manifest entry, similarity pass, and no Figma handoff markers.
  - Verifies final export summaries include `svgCount`.

- `src/components/deck/ExportStage.integration.test.tsx`
  - Renders per-slide SVG download action in final export UI.
  - Confirms the disabled SVG demo placeholder is removed.

- `src/lib/final-export-gate.test.ts`
  - Blocks export summaries with zero SVG files.

## Verification Commands

- `bun test src/lib/project-export.test.ts src/components/deck/ExportStage.integration.test.tsx src/lib/final-export-gate.test.ts`
- `bun run lint`
- `bun run verify`

