# Test Spec: DF-131 PPTX Export

## Regression Coverage

- `src/lib/project-export.test.ts`
  - Builds a ready PPTX export result with a `.pptx` file, official MIME data URL, hash, manifest metadata, and editable text/shape counts.
  - Records unsupported chart/image layers as fallback records.
  - Confirms PNG/SVG/hybrid SVG files remain present when PPTX fallbacks exist.

- `src/components/deck/ExportStage.integration.test.tsx`
  - Renders a PPTX download action.
  - Confirms the disabled PPTX placeholder is removed when PPTX export is ready.

## Verification Commands

- `bun test src/lib/project-export.test.ts src/components/deck/ExportStage.integration.test.tsx`
- `bun run lint`
- `bun run verify`

