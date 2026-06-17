# PRD: DF-130C Hybrid SVG Compatibility Export

## Goal

DeckForge provides a hybrid-safe SVG compatibility export that preserves the final visual appearance while retaining editable overlay and region metadata for downstream tools.

## Acceptance Criteria

- Export package contains `hybridSvgFiles` beside PNG, native SVG, and project JSON files.
- Hybrid SVG files use the approved layout PNG as a locked visual background.
- Hybrid SVG files include editable overlays plus extension region layers for inferred `png2svg.visual_region.*` and `png2svg.raster_region.*` sources.
- `source_layer_id` metadata remains present on editable and extension layers where derivable.
- Hybrid files use distinct paths and source labels from native SVG files.
- Manifest and export summary record hybrid SVG files and counts.
- Final export gate blocks summaries missing hybrid SVG files.
- Export UI exposes per-slide hybrid SVG download buttons.

## Non-goals

- Do not bundle the PNG2SVG Figma handoff format.
- Do not implement PPTX export.
- Do not add a pixel-diff dependency; use deterministic metadata similarity for this milestone.

