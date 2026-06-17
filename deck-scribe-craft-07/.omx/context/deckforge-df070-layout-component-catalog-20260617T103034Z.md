# DF-070 Layout Component Catalog Context

## Task Statement
Implement DF-070: define the restricted slide component catalog used by layout generation and deterministic rendering.

## Desired Outcome
- Layout generation can choose only approved component types.
- Each component declares required slots and editable layer roles.
- Component definitions reference approved design token families instead of arbitrary CSS values.
- Mock layout generation uses the catalog rather than a private free-form component list.

## Known Facts / Evidence
- `mockLayout` currently uses a private `COMPONENT_TYPES` array and emits simple HTML strings.
- `LayoutPrototype.domLayers` already records layer ids, roles, and editability.
- DF-069 will build Layout IR on top of this component catalog.

## Constraints
- No new dependencies.
- Strict TypeScript: readonly shapes, no `any`, no unsafe assertions.
- Keep new files below 250 pure LOC.
- Do not implement full Layout IR or renderer in this ticket.

## Unknowns / Open Questions
- Final component rendering details will be owned by DF-069/DF-073; this ticket only defines the contract.

## Likely Codebase Touchpoints
- `src/lib/layout-component-catalog.ts`
- `src/lib/layout-component-catalog.test.ts`
- `src/lib/mock-ai.ts`
