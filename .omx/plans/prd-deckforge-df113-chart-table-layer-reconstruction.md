# DF-113 Chart/Table Layer Reconstruction

DeckForge needs chart and table layers that remain editable and source-backed after image generation. Generated image models may produce graph-like pixels in the background, but final chart/table objects must come from dataset-backed editable layer metadata.

## Scope
- Reconstruct chart/table layers from DF-043 prepared chart data and DF-111A editable layer metadata.
- Preserve dataset id, unit, period/base years, source ids, and source-map ids.
- Support table records as editable chart-type layers with `role: "table"`.
- Track and reject generated-image graph candidates from final layer output.

## Out of Scope
- Rendering rich chart/table UI.
- Editing individual table cells.
- OCR or PNG-derived chart recovery.

## Acceptance Criteria
- Every reconstructed chart/table layer has a dataset id.
- Unit, base years/period, and sources are preserved from prepared chart data.
- Generated-image fake graph candidates are not emitted as final layers.
