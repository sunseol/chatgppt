# PRD: DF-074 DOM Layer Metadata And Bounds

## Problem
Layout rendering needs richer layer metadata for later editable layer recovery. The current prototype tracks id, role, and editability, but it does not preserve bounds, source ids, or dataset ids.

## Scope
- Enrich layout prototype DOM layer metadata with canvas-space bounds.
- Preserve source ids and dataset ids from the associated Layout IR slot.
- Provide metadata completeness checks.
- Keep coordinate output deterministic for snapshot tests.

## Acceptance Criteria
- DOM layer metadata omission count is zero for valid Layout IR.
- Bounds are stored in the canvas coordinate system.
- `sourceIds`, `datasetIds`, and `editable` are preserved.
- Local render artifacts carry the enriched metadata.

## Non-Goals
- Live browser bounding box extraction.
- Vector layer conversion.
- Visual overlap validation.
