# DF-073 Local HTML Renderer Context

## Task Statement
Implement DF-073: convert validated Layout IR into deterministic local HTML/CSS render artifacts, DOM layer metadata, and a minimal PNG preview output.

## Desired Outcome
- Each Layout IR slide renders to stable HTML and shared CSS.
- Each rendered slide includes deterministic DOM layer metadata.
- Each rendered slide includes a local PNG data URL with the Layout IR canvas aspect ratio.
- Renderer output passes the DF-072A sandbox policy.
- Renderer failures are surfaced as recoverable failures and shown in the Layout stage.

## Known Facts / Evidence
- DF-069 provides Layout IR and `LayoutPrototype`.
- DF-070 restricts allowed components and slots.
- DF-072A provides `enforceLayoutRendererSandbox`.
- Full WebView/Tauri integration is not present in this React-only codebase yet.

## Constraints
- No new dependencies.
- Keep TypeScript files below 250 pure LOC.
- Do not move renderer work into oversized `stages.tsx`.
- Avoid storing large renderer artifacts in project state unless a later ticket requires it.

## Unknowns / Open Questions
- Future Tauri/Rust renderer can replace the minimal PNG encoder while preserving the result contract.

## Likely Codebase Touchpoints
- `src/lib/layout-html-renderer.ts`
- `src/lib/png-encoder.ts`
- `src/lib/layout-html-renderer.test.ts`
- `src/lib/mock-ai.ts`
- `src/components/deck/LayoutStage.tsx`
