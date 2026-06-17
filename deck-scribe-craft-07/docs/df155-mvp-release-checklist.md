# DF-155 MVP Release Checklist

Scope: internal MVP release readiness for the current local/mock-provider DeckForge build. This is not public macOS distribution approval.

Review date: 2026-06-18

## Functional Gates

- [ ] `bun run verify` passes on the release candidate.
- [ ] `bun run test:suite` passes all MVP suite targets.
- [ ] Project creation, interview, research, plan, design, layout, generation, review, vectorize, editor, report, and export can run through the mock happy path.
- [ ] Final export package includes PNG, SVG, hybrid SVG, PPTX-compatible package, manifest, and redacted project file.
- [ ] Approval log records interview, research, plan, design, layout, review, vectorize, editor, and export.
- [ ] Downstream invalidation and blocked final-export behavior remain covered by tests.

## Quality Gates

- [ ] Typecheck passes with `tsc --noEmit`.
- [ ] Lint has no errors. Known warnings are limited to existing `react-refresh/only-export-components` warnings in shared UI components.
- [ ] Automated suite includes state machine, context hash, prompt package, source map, design token, Layout IR, HTML hardening, layout render, DOM metadata, SVG editability, PNG2SVG corpus, happy path E2E, and export regression coverage.
- [ ] MVP scoring harness reports release readiness for the complete benchmark fixture.
- [ ] Regression tests cover report completeness and final export gate behavior.

## User QA Gates

- [ ] Run `docs/df154-manual-qa-scenarios.md` with at least one first-time tester.
- [ ] 10분 신규 프로젝트 생성 scenario passes.
- [ ] 5분 편집 검증 scenario passes.
- [ ] Final report comprehension passes.
- [ ] All P1 manual-QA findings have owner, severity, reproduction notes, and follow-up ticket.

## Security And Privacy Gates

- [ ] Redaction tests pass for API keys, bearer tokens, and secret-like values.
- [ ] Export project file is redacted before packaging.
- [ ] Provider logs do not store raw provider output or credentials.
- [ ] DF-156 license review remains valid for the current `package.json` and `bun.lock`.
- [ ] PNG2SVG remains reference-only until license provenance is resolved.

## Packaging Gates

- [ ] `bun run package:dry-run` creates the internal unsigned dry-run package.
- [ ] `docs/df157-packaging-signing-notarization.md` is reviewed before sharing an internal package.
- [ ] Internal dry-run package is labeled as unsigned and not notarized.
- [ ] Public distribution remains blocked until final Tauri packaging, signing, notarization, and Gatekeeper validation are complete.

## P0 Completion Audit

All P0 ticket IDs from `docs/codex_ppt_ticket_breakdown.md` were audited for release readiness status.

| Status | Tickets |
| --- | --- |
| Covered by current MVP implementation, docs, or automated/manual release gate | DF-001 DF-002 DF-003 DF-004 DF-004A DF-005 DF-006 DF-007A DF-007B DF-010 DF-011 DF-012 DF-013 DF-013A DF-014 DF-015A DF-019 DF-020 DF-021 DF-022 DF-023A DF-025 DF-030 DF-031 DF-032 DF-033 DF-040 DF-041 DF-041A DF-041B DF-041C DF-042 DF-043A DF-044 DF-050 DF-051 DF-052 DF-053A DF-060 DF-061 DF-062A DF-066A DF-069 DF-070 DF-071 DF-072A DF-073 DF-074 DF-075 DF-076 DF-080 DF-081 DF-082 DF-089 DF-090 DF-091 DF-092 DF-093 DF-095 DF-096 DF-100 DF-110 DF-111A DF-112 DF-114 DF-120 DF-121 DF-122 DF-124 DF-130A DF-132 DF-133 DF-140 DF-141 DF-142 DF-144 DF-153 |
| Public desktop release needs additional packaging evidence | DF-001 DF-004A DF-013A |

Audit interpretation:

- Current branch is acceptable only for internal MVP validation if all commands above pass.
- Public desktop release is not approved until the packaging blockers below are cleared.

## Evidence Locations

Final report samples:

- `src/lib/happy-path-e2e.test.ts`: asserts `result.generationReport` includes the export package section.
- `src/lib/mvp-scoring.fixture.ts`: `completeBenchmark().generationReportMarkdown` is the scoring fixture report sample.
- `src/lib/generation-report.test.ts`: validates slide lineage, sources, approvals, risks, prompt versions, audit log, and export package report sections.

Benchmark results and definitions:

- `src/lib/benchmark-suite.ts`: full 30-case benchmark manifest.
- `src/lib/benchmark-suite.test.ts`: validates benchmark count, categories, and evaluability threshold.
- `src/lib/mvp-scoring.test.ts`: validates MVP scoring and release-ready fixture behavior.
- `src/lib/happy-path-e2e.test.ts`: validates one full mock-provider project from creation to final export/report.
- `bun run verify`: canonical local evidence command for typecheck, all tests, and production build.
- `bun run test:suite`: named MVP regression subset.

Release-adjacent docs:

- `docs/df154-manual-qa-scenarios.md`: manual QA script and dry-run template.
- `docs/df156-license-oss-compliance.md`: dependency/license findings.
- `docs/df157-packaging-signing-notarization.md`: internal dry-run package, signing, notarization, and fallback path.

## Unverified Items

These are not automatic release blockers for internal mock-provider validation, but they must be tracked before broader testing.

- [ ] Live Codex/OpenAI provider E2E with real credentials.
- [ ] Manual QA dry run with an external first-time tester.
- [ ] Clean-machine package execution outside the developer workstation.
- [ ] Final third-party notices generated from the exact package artifact.
- [ ] Final Rust/Tauri dependency license review after native manifests exist.

## Release Blockers

Do not approve public distribution while any item below is unresolved.

- [ ] `bun run verify` fails on the release candidate.
- [ ] `bun run test:suite` fails on the release candidate.
- [ ] Manual QA session fails a P0 scenario or exposes a secret-like value.
- [ ] PNG2SVG code or Figma plugin is bundled before license provenance is resolved.
- [ ] Final Tauri app manifest, signing certificate, notarization, stapling, and Gatekeeper validation are missing.
- [ ] Internal dry-run package is presented as a signed or notarized release.

## Release Readiness Review

Reviewer checklist:

- [ ] Confirm all Functional Gates are checked.
- [ ] Confirm all Quality Gates are checked.
- [ ] Confirm all User QA Gates are checked or explicitly deferred for internal-only validation.
- [ ] Confirm all Security And Privacy Gates are checked.
- [ ] Confirm Packaging Gates match intended release audience.
- [ ] Confirm Unverified Items have owners.
- [ ] Confirm Release Blockers are empty for the intended release audience.

Decision:

| Field | Value |
| --- | --- |
| Intended audience | Internal MVP validation |
| Release decision | Pending review |
| Reviewer |  |
| Date |  |
| Verification command output location |  |
| Manual QA run link |  |
| Follow-up blockers |  |
