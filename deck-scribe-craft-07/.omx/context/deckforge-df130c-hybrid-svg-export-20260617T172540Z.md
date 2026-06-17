# DF-130C Hybrid SVG Compatibility Export Context

Ticket: DF-130C Hybrid SVG Compatibility Export
Date: 2026-06-17T17:25:40Z

## Relevant Surfaces

- `src/lib/svg-project-export.ts` builds native editable SVG files for the DF-130B export package.
- `src/lib/editable-svg-renderer.ts` already supports locked background images and extension region layers.
- `src/lib/png2svg-adapter-spike.ts` models `hybridSvgPath`, visual regions, raster regions, and `png2svg.*` source ids, but its Figma handoff package remains outside the product export format.
- `src/lib/project-export.ts` owns manifest, package, and summary wiring.
- `src/components/deck/ExportStage.tsx` exposes downloadable export artifacts.

## Product Decision

Hybrid SVG is a DeckForge compatibility export, not a PNG2SVG handoff bundle. It should prioritize visual preservation by keeping the approved layout PNG as a locked base and layering editable guides/text/vector regions above it.

## Required Behavior

- Build one hybrid compatibility SVG per editable slide.
- Preserve the locked visual base from the approved layout PNG.
- Include editable overlays and PNG2SVG visual/raster region metadata where source ids can be inferred.
- Keep native SVG and hybrid SVG outputs separate: distinct paths, source labels, hashes, manifest lists, and summary counts.
- Surface hybrid SVG downloads in the export UI.
- Final gate requires hybrid SVG output in addition to PNG, native SVG, and project JSON.

