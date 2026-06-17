# PRD: DF-151A PNG2SVG Regression Corpus

## Goal

DeckForge has a deterministic PNG2SVG regression corpus manifest that captures manually tested PNG2SVG cases and benchmark-derived images, with enough metadata to compare adapter output across future changes.

## Acceptance Criteria

- The corpus includes at least 20 fixtures.
- Every fixture has an original PNG path, expected manifest path, expected editable SVG path, expected hybrid-safe SVG path, failure conditions, and manual QA notes.
- The corpus can verify that `text_candidates`, `raster_regions`, `visual_regions`, and `hybrid-safe` outputs are comparable.
- A fixture diff report includes both visual diff and metadata diff records for every fixture.

## Non-goals

- Do not add binary PNG assets in this ticket.
- Do not implement pixel-level rendering or image comparison engines.
- Do not change the PNG2SVG adapter behavior.
