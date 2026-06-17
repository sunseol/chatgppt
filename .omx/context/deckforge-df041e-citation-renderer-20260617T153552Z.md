# DF-041E Citation Renderer Context

## Ticket

DF-041E. Citation Renderer

## Desired Outcome

Sources can be formatted consistently for slide footers, Generation Report, and Source Map surfaces while marking uncertain or low-grade sources clearly.

## Known Facts / Evidence

- `Source` includes id, title, publisher, year, grade, sourceType, usePolicy, and optional URL.
- `Generation Report` currently renders simple source lines directly.
- `Slide Source Map` currently renders ids for claims, sources, and datasets.
- Source policy from DF-041A defines source grades and use policies.

## Constraints

- Keep formatter pure and source-type aware.
- Produce short slide citations and detailed report/source-map citations.
- Mark grade C/D, restricted sources, or explicitly uncertain sources as review-required.

## Unknowns / Open Questions

- Full style-guide citation rules can evolve later; this ticket only needs stable MVP formats.

## Likely Codebase Touchpoints

- New `src/lib/citation-renderer.ts`
- New `src/lib/citation-renderer.test.ts`
- `src/lib/generation-report.ts`
