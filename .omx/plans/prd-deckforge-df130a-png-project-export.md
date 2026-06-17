# PRD: DF-130A PNG/Project Export

## Goal

Allow the final export stage to produce downloadable PNG slide files and a credential-safe project JSON file, then persist an export artifact summary for downstream report/final-gate tickets.

## Requirements

- Build one PNG export file per editable slide.
- Use the approved final layout PNG as the visual baseline for the P0 local path.
- Build a project JSON file with secret-like values redacted.
- Create a stable export artifact id/hash/path under `projects/{projectId}/exports`.
- Store the export artifact summary when the export stage finalizes.
- Block packaging when required layout PNGs are missing.

## Non-Goals

- Native SVG export, hybrid SVG export, and PPTX export are separate tickets.
- Pixel-perfect browser rasterization of SVG overlays is outside DF-130A.
