# PRD: DF-096 Final Slide Compositor

## Problem

Generated slide images can contain broken text or fake charts, so final preview/export must be based on a compositor that overlays trusted editable layers above the generated background.

## Requirements

- Compose a generated background artifact with an MVP Editable Layer Model.
- Render title, body, source, metric, and chart layers as separate editable SVG groups/text.
- Keep the generated background locked and visually behind overlays.
- Produce a deterministic SVG and preview PNG data URL.
- Mark the compositor result as the export basis.

## Acceptance

- Text errors in generated images cannot override editable overlay text.
- Title/body/source/chart overlays are read from the editable layer model.
- Complex visual background remains as a generated background image.
- Export metadata points to the compositor result.
