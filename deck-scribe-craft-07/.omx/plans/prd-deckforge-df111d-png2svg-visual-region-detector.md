# PRD: DF-111D PNG2SVG Visual Region Detector Port

## Objective

Turn PNG2SVG-like region metadata into DeckForge movable visual/image region layers without depending on the external Figma importer.

## Acceptance Criteria

- Main panels, photo-like regions, and icon blocks become movable region layers.
- Region layers do not collide with DF-111A text/chart/source overlays.
- Benchmark output records oversegmentation, missing region, blur risk, and text intrusion cases.
- Every accepted region tracks original PNG path/hash, source id, bounds, and confidence.

## Non-Goals

- Porting external Python image-processing code directly.
- Replacing the generated-background plus editable-overlay P0 path.
- OCR text recovery.
