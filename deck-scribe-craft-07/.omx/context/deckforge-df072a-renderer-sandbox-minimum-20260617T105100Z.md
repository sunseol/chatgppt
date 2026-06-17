# DF-072A Renderer Sandbox Minimum Context

## Task Statement
Implement DF-072A: guarantee a minimum sandbox policy for Layout IR rendering so rendered layout HTML cannot request external URLs, access Tauri APIs, execute scripts, or use inline event handlers.

## Desired Outcome
- Layout rendering validates generated HTML before returning a `LayoutPrototype`.
- External URL surfaces fail validation.
- Tauri API access surfaces fail validation.
- Script tags and inline event handlers fail validation.
- Sandbox policy failures fail rendering instead of returning unsafe layout output.

## Known Facts / Evidence
- DF-069 moved layout generation through deterministic `renderLayoutIrToPrototype`.
- Current renderer emits a small static section/div structure.
- DF-071 prompt explicitly forbids CSS, JS, URLs, external resources, and HTML in provider output.

## Constraints
- No browser WebView implementation in this ticket.
- No new dependencies.
- Keep TypeScript files below 250 pure LOC.
- Avoid broad refactors in `LayoutStage` or `stages.tsx`.

## Unknowns / Open Questions
- DF-073 will decide the full local HTML renderer and browser/container mechanics.

## Likely Codebase Touchpoints
- `src/lib/layout-renderer-sandbox.ts`
- `src/lib/layout-renderer-sandbox.test.ts`
- `src/lib/layout-ir.ts`
