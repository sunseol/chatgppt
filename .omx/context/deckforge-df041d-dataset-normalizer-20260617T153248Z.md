# DF-041D Dataset Normalizer Context

## Ticket

DF-041D. Dataset Normalizer

## Desired Outcome

CSV/XLSX/table/API-style rows can be converted into the common `ResearchDataset` schema with explicit unit, period, geography, missing-value handling, and chart metadata linkage.

## Known Facts / Evidence

- `ResearchDataset` already stores id, title, sourceIds, unit, period, geography, definition, rows, and uncertainty.
- `ResearchChart` links chart metadata to a dataset id.
- `buildBasicChartOverlays` consumes `ResearchDataset.rows` with label/value/year/segment.
- Research pack schema already validates datasets and chart references.

## Constraints

- Keep the normalizer as a pure domain module.
- Preserve existing research pack schema and chart overlay contracts.
- Support table-like rows without adding XLSX parsing dependencies.
- Store missing value handling rules instead of silently dropping them.

## Unknowns / Open Questions

- Binary XLSX parsing can be added later through an adapter; DF-041D can normalize already-extracted workbook rows.

## Likely Codebase Touchpoints

- New `src/lib/dataset-normalizer.ts`
- New `src/lib/dataset-normalizer.test.ts`
- Existing `src/lib/research-types.ts` consumers
