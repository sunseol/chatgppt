# PRD: DF-111B Advanced Layer Matching

## Objective

Merge DF-111D visual region layers into the DF-111A MVP editable model to improve Level 3 object editability without replacing the safe overlay path.

## Acceptance Criteria

- Main editable objects link to DOM metadata or `png2svg.visual_region` / `png2svg.raster_region` source ids.
- Existing generated-background plus editable-overlay P0 path is preserved.
- Slide Spec and DOM text remain authoritative over OCR hints.
- Oversegmentation makes at most 10% of benchmark slides unusable.

## Non-Goals

- Running OCR or external PNG analysis.
- Replacing MVP overlay composition.
- Rendering UI for advanced matching results.
