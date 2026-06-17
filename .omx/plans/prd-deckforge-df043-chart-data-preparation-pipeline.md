# PRD: DF-043 Chart Data Preparation Pipeline

## Problem

The image model must not invent chart values, and downstream editable layers need consistent metadata linking chart specs, datasets, layout placeholders, and final overlay ids. Current basic chart overlay rendering covers part of this, but there is no explicit preparation contract that validates metadata before generation.

## Scope

- Build chart preparation records from research charts, datasets, source map, and layout prototype.
- Preserve chart id, dataset id, unit, period/base years, source ids, and source map ids.
- Bind HTML layout chart placeholders to final editable overlay ids using the same chart id.
- Emit a generation policy instructing the image model not to draw chart values.
- Support metadata preparation for bar, line, and table chart types.

## Acceptance Criteria

- Chart values are assigned to editable overlay rendering, not image generation.
- Chart metadata stores dataset, unit, base year, and source lineage.
- HTML layout prototype and final layer binding share the same chart id.

## Non-Goals

- New chart renderer for table charts.
- UI chart editor.
- Automatic chart type inference.
