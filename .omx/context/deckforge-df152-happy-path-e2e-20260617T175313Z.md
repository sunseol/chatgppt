# DF-152 Happy Path E2E Context

Ticket: DF-152 Happy Path E2E 테스트 구현
Date: 2026-06-17T17:53:13Z

## Relevant Surfaces

- `src/lib/createMockDeckProvider.ts` equivalent surface is `createMockDeckProvider()` in `src/lib/mock-provider.ts`.
- `src/lib/project-creation.ts` creates local projects without browser storage.
- `src/lib/workflow-engine.ts` defines approval transitions for interview, research, plan, design, layout, review, vectorize, and editor.
- `src/lib/project-export.ts` builds PNG/SVG/hybrid SVG/PPTX-compatible export packages.
- `src/lib/generation-report.ts` builds the final report from project artifacts and export summary.

## Product Decision

DF-152 should add a local, deterministic E2E harness over the existing library/provider contracts. It should not require a browser, live provider credentials, or CI-specific infrastructure. The test must exercise the approval-based workflow and assert final report/export artifacts exist.

## Required Behavior

- Create a benchmark representative project.
- Run mock interview, research, plan, design, layout, slide generation, slide review approval, vectorization, editor approval, final report, and export.
- Persist artifact records for each approved stage.
- End at `EXPORT_READY`.
- Return enough evidence for tests to assert stage visitation, artifacts, report, and export outputs.
