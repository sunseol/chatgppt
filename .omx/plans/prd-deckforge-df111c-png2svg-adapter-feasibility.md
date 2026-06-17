# PRD: DF-111C PNG2SVG Adapter Feasibility Spike

## Objective

Define a safe DeckForge adapter boundary for PNG2SVG-like outputs without bundling the external repository or its Figma plugin path.

## Acceptance Criteria

- Adapter can run in CLI/library-style mode without `figma-import.json`.
- Ten PNG fixture outputs can be summarized with metadata/visual diff records.
- Text candidates, vector regions, raster regions, and visual regions convert into DeckForge draft layer metadata.
- Converted layer sources use `png2svg.*` source ids.
- `ocrEngine: "none"` succeeds and records OCR as unavailable instead of failing.
- Spike report records limitations and DF-156 license/ownership handoff.

## Non-Goals

- Running the external Python project.
- Vendoring PNG2SVG code.
- Pixel-perfect visual diffing.
- Figma plugin import support in MVP.
