# DF-066 PRD: Font Manager

## Goal

Manage Korean-safe font fallback selection and export mappings across HTML preview, editor reconstruction, SVG export, and PPTX export.

## Scope

- Detect which known Korean fallback fonts are locally available from a supplied local font list.
- Expose one managed policy that reuses `FONT_POLICY`.
- Produce role mappings for title, body, caption, number, and source text.
- Produce surface mappings for preview, editor, SVG export, and PPTX export.
- Preserve the no-bundled-font rule.

## Acceptance Criteria

- Korean title/body/caption fallback mappings are consistent across surfaces.
- SVG/PPTX export mappings use the same family/line-height/letter-spacing policy as preview/editor.
- No unclear-license font files are bundled.

## Non-Goals

- Native OS font enumeration.
- Downloading or bundling font files.
- User-facing font picker UI.
