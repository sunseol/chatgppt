# PRD: DF-130B Native SVG Export

## Goal

DeckForge exports native SVG slide files from the editable layer model and approved compositor basis so downstream users can inspect and edit slide objects without using PNG2SVG handoff packages as the product format.

## Acceptance Criteria

- Export package contains `svgFiles` beside existing PNG and project JSON files.
- Each SVG file is built from DeckForge editable layers and includes `data-editable-layer`, `data-layer-type`, and `data-source-layer-id` metadata.
- DOM layer ids are retained when an editable layer matches a layout DOM layer; PNG2SVG source ids are retained when derivable from existing layer ids.
- SVG files include similarity reports and pass the deterministic export threshold.
- The manifest records SVG paths and hashes.
- Final export summaries require at least one SVG export.
- Export UI provides per-slide SVG download buttons instead of the disabled SVG placeholder.

## Non-goals

- Do not implement PPTX export.
- Do not adopt the PNG2SVG Figma handoff package as DeckForge's export format.
- Do not add new runtime dependencies.

