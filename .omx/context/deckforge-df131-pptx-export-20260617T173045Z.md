# DF-131 PPTX Export Context

Ticket: DF-131 PPTX export stretch goal
Date: 2026-06-17T17:30:45Z

## Relevant Surfaces

- `src/lib/project-export.ts` builds the final export package and now includes PNG, native SVG, hybrid SVG, project JSON, manifest, and summary.
- `src/components/deck/ExportStage.tsx` downloads export artifacts and still shows PPTX as disabled.
- `src/lib/font-manager.ts` already defines a `pptx_export` font surface using the same Korean-safe role mappings.
- No external PPTX writer dependency is declared, and project rules prohibit adding new dependencies without explicit request.

## Product Decision

PPTX is a stretch export. It should be best-effort and independent from required PNG/SVG/project exports. Text and simple shape layers should become editable PowerPoint shapes; unsupported layers should be recorded as explicit fallbacks. PPTX failure or fallback status must not block or remove PNG/SVG export artifacts.

## Required Behavior

- Add a `pptxExport` result to project export packages.
- Generate a deterministic local PPTX-compatible OOXML package data URL without adding dependencies.
- Preserve editable text and simple rectangle shape layers.
- Record unsupported image/chart layers as fallbacks with clear reasons.
- Include PPTX manifest metadata when ready.
- Replace the disabled PPTX export UI placeholder with a download button when ready.

