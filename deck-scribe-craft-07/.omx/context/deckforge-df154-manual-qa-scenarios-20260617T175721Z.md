# DF-154 Manual QA Scenario Context

Ticket: DF-154 Manual QA 시나리오 문서 작성
Date: 2026-06-17T17:57:21Z

## Relevant Surfaces

- DF-152 added `src/lib/happy-path-e2e.ts` and `src/lib/happy-path-e2e.test.ts`, proving the mock-provider happy path reaches final report and export.
- Existing docs only cover license compliance and packaging; there is no manual QA scenario document yet.
- `package.json` exposes `bun run verify` and `bun run test:suite` for pre-QA setup.

## Product Decision

DF-154 should produce an operator-ready manual QA script. The script must be usable by a QA owner without reading code and must cover three user-facing checks: new-user 10-minute project creation, 5-minute editing, and final report comprehension.

## Required Behavior

- Document setup, tester profile, scenario steps, observation metrics, pass thresholds, and dry-run recording.
- Keep checklist steps concrete and time-boxed.
- Add a regression test that verifies the document retains required sections and measurable pass criteria.
