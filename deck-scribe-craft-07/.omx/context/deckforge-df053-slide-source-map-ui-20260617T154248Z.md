# DF-053 Slide Source Map UI Context

## Ticket

- DF-053. Slide Source Map UI/고급 연결
- Depends on DF-053A

## Existing Surface

- `src/lib/slide-source-map.ts` builds the minimal source map and rejects source-less numeric claims.
- `src/lib/generation-report.ts` already renders the minimal source map in the final report.
- `src/components/deck/PlanStage.tsx` is the natural review surface because it has both parsed slide specs and approved research.
- `src/lib/slide-context-bundle.ts` currently builds image generation facts directly from slide evidence and can leak a rejected source-less numeric claim.

## Implementation Direction

- Add a pure review/correction layer over `MinimalSlideSourceMap`.
- Add a compact source map review panel for slide-by-slide claims, sources, datasets, rejected claims, and fatal issues.
- Integrate the panel into the Plan stage sidebar when a plan and research pack exist.
- Gate image generation facts by the accepted source map claim ids so rejected numeric claims do not enter the prompt package.

## Verification

- Unit tests for review model, correction application, and image gate.
- Server-rendered integration test for the source map panel.
- Regression test for slide context bundle excluding source-less numeric claims.
- Run `bun run lint` and `bun run verify`.
