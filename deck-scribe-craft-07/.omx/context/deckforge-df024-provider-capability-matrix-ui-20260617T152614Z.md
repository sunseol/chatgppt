# DF-024 Provider Capability Matrix UI Context

## Ticket

DF-024. Provider capability matrix UI

## Desired Outcome

Users can see which provider-backed features are available under the current authentication/setup state and why locked features are unavailable.

## Known Facts / Evidence

- `ProviderCapability` currently includes interview, research, deckPlan, designSystem, layoutPrototype, imageGeneration, and editableLayers.
- `ProviderStatus` represents connected, requiresAuth, and unavailable states.
- DF-023 added OpenAI image fallback public state with setup and credential state.
- `NewProjectForm` is the first obvious setup surface before the workflow starts.

## Constraints

- Display text planning, research assist, image generation, and revision generation.
- Locked features must include a reason and remediation path.
- Keep UI implementation small and testable through server-side static rendering.
- Do not introduce new dependencies.

## Unknowns / Open Questions

- Future provider implementations may expose a dedicated revision-generation capability. For now, revision generation is derived from image generation plus editable layer support.

## Likely Codebase Touchpoints

- `src/lib/provider-types.ts`
- New `src/lib/provider-capability-view.ts`
- New `src/components/deck/ProviderCapabilityMatrix.tsx`
- `src/components/deck/NewProjectForm.tsx`
