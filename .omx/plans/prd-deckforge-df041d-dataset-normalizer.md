# PRD: DF-041D Dataset Normalizer

## Problem

Chart generation needs a consistent dataset contract regardless of whether values came from CSV, XLSX, table extraction, or API rows. The system must preserve unit, time period, geography, missing-value handling, and chart linkage so later validation and rendering can audit the data.

## Scope

- Normalize table-like rows into `ResearchDataset`.
- Accept source kind labels for CSV, XLSX, table, and API inputs.
- Record missing-value handling rules.
- Generate linked `ResearchChart` metadata for chart rendering.
- Preserve source ids and uncertainty flags.

## Acceptance Criteria

- CSV/XLSX/table/API row inputs convert into the common dataset schema.
- Unit, period, geography, and missing-value handling are retained.
- Chart metadata links back to the normalized dataset id.

## Non-Goals

- Binary XLSX parsing.
- Automatic chart type inference beyond caller-provided chart type.
- UI dataset editor.
