# DF-035 Logo/Image Asset Placement Context

## Ticket

DF-035. Logo/Image Asset Placement

## Desired Outcome

User-provided logo and product image assets can be safely reflected into the design system or slide specification while preserving source asset lineage and external-provider confirmation state.

## Known Facts / Evidence

- DF-034 added `ProjectAsset`, `asset` artifacts, asset hashes, reference targets, and external transfer review.
- Imported project assets include `artifact.id`, `kind`, `sensitive`, original filename, MIME type, and asset path.
- User-provided assets must be prioritized over arbitrary generated logos.

## Constraints

- Keep scope in the domain/model layer unless UI integration is required by acceptance criteria.
- Preserve source asset id on placement suggestions.
- Do not silently approve sending sensitive user assets to external image providers.
- Keep TypeScript files strict and below the 250 pure LOC ceiling.

## Unknowns / Open Questions

- Exact downstream slide-spec/design-system schema may evolve; the placement model should expose stable data that later adapters can consume.

## Likely Codebase Touchpoints

- `src/lib/project-assets.ts`
- New asset placement model/test files under `src/lib/`
- Existing slide/design prompt modules may consume this model in later tickets.
