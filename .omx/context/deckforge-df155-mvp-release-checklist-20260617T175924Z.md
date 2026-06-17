# DF-155 MVP Release Checklist Context

Ticket: DF-155 MVP 릴리스 체크리스트 작성
Date: 2026-06-17T17:59:24Z

## Relevant Surfaces

- DF-153 provides the MVP scoring harness in `src/lib/mvp-scoring.ts` and fixtures in `src/lib/mvp-scoring.fixture.ts`.
- DF-154 provides manual QA scenarios in `docs/df154-manual-qa-scenarios.md`.
- DF-156 and DF-157 provide release-adjacent license and packaging documents.
- The full P0 ticket list is defined in `docs/codex_ppt_ticket_breakdown.md`.

## Product Decision

DF-155 should create a release readiness checklist document, not a release approval. The checklist must separate verified items, unverified items, and release blockers, and it must record where final report samples and benchmark results can be found.

## Required Behavior

- Include every P0 ticket ID in the release checklist.
- Separate unverified items from release blockers.
- Include functional, quality, user/manual QA, security/privacy, packaging, and evidence sections.
- Add a regression test to prevent accidental removal of P0 IDs or evidence locations.
