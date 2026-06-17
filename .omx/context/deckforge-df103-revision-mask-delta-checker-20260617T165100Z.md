# DF-103 Revision Mask & Delta Checker Context

Implement DF-103 from `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`.

Existing state:
- DF-101 creates before/after comparison metadata for preserved slide revisions.
- DF-102 displays comparison summaries and preservation risk in the review UI.

Implementation direction:
- Add a deterministic delta checker library, not pixel processing.
- Accept region-level mask intent: `must_keep` or `must_change`.
- Treat large `must_keep` deltas as failed revision candidates.
- Treat missing requested-change deltas as warning candidates.
- Produce a history entry with summary and issues for revision history persistence.

Verification:
- Add unit tests for passed, failed, and warning delta reports.
- Run target tests, lint, and full verify.
