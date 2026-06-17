# PRD: DF-101 Preserve Original Revision Generation

## Objective

Generate a revised slide candidate from the original slide image plus a structured revision request while preserving non-target elements.

## Acceptance Criteria

- Revision provider input includes the original slide image reference and the user edit instruction.
- Requested changes are represented separately from `mustKeep` preservation targets.
- If a `mustKeep` target changes or is not checked, the generation result fails.
- A successful revision creates a new slide version and deterministic revision artifact metadata.
- The result includes before/after comparison data suitable for DF-102 UI.

## Non-Goals

- Pixel-level mask comparison belongs to DF-103.
- UI compare flow belongs to DF-102.
- Real external image API integration is outside this ticket.
