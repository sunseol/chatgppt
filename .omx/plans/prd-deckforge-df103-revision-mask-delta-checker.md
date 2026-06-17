# PRD: DF-103 Revision Mask & Delta Checker

## Objective

Evaluate before/after revision deltas against explicit preserve and change masks so unintended changes are visible before approval.

## Acceptance Criteria

- Large changes inside `must_keep` regions fail or warn.
- Requested change regions that barely change are surfaced as revision candidates.
- A delta summary is emitted as a revision history entry.
- Review candidates distinguish approval warnings from re-revision blockers.

## Non-Goals

- Raw PNG pixel comparison is out of scope for this ticket.
- UI rendering is covered by DF-102 and can consume this report later.
