# DF-130B Native SVG Export Context

Ticket: DF-130B SVG Export
Date: 2026-06-17T17:20:56Z

## Relevant Surfaces

- `src/lib/project-export.ts` currently exports approved layout PNG files and a redacted project JSON.
- `src/lib/editable-svg-renderer.ts` already renders editable SVG from `MvpEditableLayerModel`, including `data-source-layer-id`, editable layer ids, source map ids, and optional generated PNG background.
- `src/lib/deck-types.ts` stores project layers as a lighter `EditableLayerModel`, so export needs a deterministic adapter into MVP editable SVG layers.
- `src/components/deck/ExportStage.tsx` currently exposes PNG/project downloads and disables SVG export.

## Product Decision

Native SVG export belongs in the DeckForge export package, not in the PNG2SVG Figma handoff package format. The exported SVG should use DeckForge paths, hashes, manifest entries, and final export gate requirements.

## Required Behavior

- Build one native SVG file per editable slide model.
- Preserve editable SVG structure using separate text/shape/image/chart objects.
- Preserve DOM/source layer metadata when layout DOM data can be matched.
- Preserve `png2svg.*` source ids when a layer id carries PNG2SVG provenance.
- Include deterministic similarity metadata against the approved layout PNG basis.
- Expose SVG downloads in the final export screen.
- Block final export summaries that do not contain SVG files.

