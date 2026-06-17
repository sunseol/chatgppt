# PRD: DF-102 Revision Compare UI

## Objective

Provide a reusable UI for reviewing a revised slide candidate against its original version.

## Acceptance Criteria

- Users can approve a revision candidate.
- Users can request another revision.
- The UI shows before and after versions.
- The UI shows requested changes and a generated change summary.
- The UI surfaces possible unintended changes from preservation checks.

## Non-Goals

- Pixel-level mask/delta computation belongs to DF-103.
- Persisting approval history is handled by downstream workflow integration.
