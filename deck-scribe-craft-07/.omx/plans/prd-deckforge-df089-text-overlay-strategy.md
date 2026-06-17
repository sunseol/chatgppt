# PRD: DF-089 Text Overlay Strategy

## Problem

Image generation models often render broken text, fake numbers, and fake charts. The deck pipeline needs a deterministic split between generated visual background and app-rendered editable overlays before slide generation starts.

## Requirements

- Classify layout DOM layers into generated background, editable text overlay, and chart overlay responsibilities.
- Reserve overlay bounds so generated backgrounds do not collide with editable text or chart layers.
- Keep source map ids on chart and source-related overlays.
- Produce a slide image prompt addendum that bans exact text, numbers, fake charts, fake logos, and literal web UI reproduction.

## Out of Scope

- Actual final compositing.
- Real provider calls.
- SVG/vector conversion.

## Acceptance

- Title, body, metric/number, caption, CTA, and source roles become editable text overlays.
- Chart and table roles become data-backed chart overlays.
- Visual/image roles remain generated background only.
- The prompt addendum does not echo exact slide title/body text.
