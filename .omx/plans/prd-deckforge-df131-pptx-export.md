# PRD: DF-131 PPTX Export

## Goal

DeckForge can export a best-effort PowerPoint-compatible package from editable layer models after PNG/SVG/project export artifacts are ready.

## Acceptance Criteria

- Export package includes a `pptxExport` result independent of PNG/SVG/hybrid SVG files.
- Ready PPTX exports contain a downloadable `.pptx` file with the official PPTX MIME type.
- Text layers are represented as editable PowerPoint text shapes.
- Simple shape layers are represented as editable PowerPoint shape geometry.
- Unsupported chart/image layers are not silently dropped; each produces a fallback record.
- Native PNG/SVG/hybrid SVG export remains ready even when PPTX has fallbacks.
- Export UI exposes a PPTX download when the PPTX result is ready.

## Non-goals

- Do not add a third-party PPTX writer.
- Do not implement full chart-native PPTX conversion.
- Do not make PPTX a final-gate blocker in this stretch ticket.

