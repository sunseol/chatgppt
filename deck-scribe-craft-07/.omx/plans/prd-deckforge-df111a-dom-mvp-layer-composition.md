# PRD: DF-111A DOM MVP Layer Composition

## Problem

Generated images cannot be trusted to contain editable, accurate text, numbers, sources, or charts. The app needs an MVP layer model derived from approved DOM metadata and slide/source context.

## Requirements

- Compose editable title, body, source, metric, and chart overlay layers from DOM metadata.
- Preserve source layer ids, bounds, source ids, dataset ids, and source map ids.
- Link chart overlays to source-backed chart metadata when available.
- Produce editability scoring for title/body overlay coverage.
- Keep generated background out of the editable overlay model.

## Acceptance

- Title and body overlays are editable text layers.
- Chart and source layers preserve source map lineage.
- Level 2 editability is achieved without PNG analysis.
- Scoring reports title and body editable rates.
