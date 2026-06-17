# DF-113 Chart/Table Layer Reconstruction Context

## Task Statement
Implement DF-113 so charts and tables become data-backed editable layers rather than final image-model graph pixels.

## Desired Outcome
- Chart/table final layers carry `dataset_id`, unit, period/base years, source ids, and source-map ids.
- Table charts are represented through the same editable overlay path as charts.
- Image-model fake graph regions are rejected from final editable layer reconstruction.

## Known Facts / Evidence
- DF-043 provides `prepareChartDataPipeline` with dataset/unit/period/base-year/source metadata and editable overlay policy.
- DF-111A composes MVP editable chart layers from DOM layer metadata and chart overlays.
- `MvpEditableLayer` uses `type: "chart"` for chart-like layers; table layers can be represented as `role: "table"`.

## Constraints
- Do not use generated background graph pixels as final chart/table layers.
- Preserve existing generated-background plus editable-overlay safety path.
- Keep TypeScript files under OMO strict rules and size limits.

## Unknowns / Open Questions
- Rich table cell editing UI is outside this ticket.
- Future chart renderer can consume the reconstructed metadata, but this ticket only creates the deterministic layer contract.

## Likely Codebase Touchpoints
- `src/lib/chart-data-pipeline.ts`
- `src/lib/editable-layer-model.ts`
- New `src/lib/chart-table-layer-reconstruction.ts`
- New `src/lib/chart-table-layer-reconstruction.test.ts`
