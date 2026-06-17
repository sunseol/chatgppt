# DF-043 Chart Data Preparation Pipeline Context

## Ticket

DF-043. Chart data preparation pipeline

## Desired Outcome

Chart metadata is prepared from source-backed datasets before slide image generation, binding each chart to dataset/unit/base-year/source metadata, HTML layout placeholders, and final editable overlay ids.

## Known Facts / Evidence

- DF-043A `buildBasicChartOverlays` renders bar/line overlays from research chart metadata.
- DF-041D added `normalizeTabularDataset` to create linked datasets and charts from source rows.
- `LayoutPrototype` DOM layers expose chart placeholders through `role: "chart"`.
- Final editable layers already carry `chartOverlayId` when composed from chart overlays.

## Constraints

- Image models must not draw fake chart values.
- Metadata must retain dataset id, unit, base years, and source ids.
- Layout placeholder binding and final overlay binding must share the same chart id.
- Keep this as a pure validation/preparation module.

## Unknowns / Open Questions

- Rendering support for table charts remains downstream; DF-043 prepares metadata for table charts but does not render them.

## Likely Codebase Touchpoints

- New `src/lib/chart-data-pipeline.ts`
- New `src/lib/chart-data-pipeline.test.ts`
- Existing `src/lib/chart-overlay.ts` conventions
