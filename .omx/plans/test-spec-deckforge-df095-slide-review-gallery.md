# Test Spec: DF-095 Slide Review Gallery

## Automated Tests

- Slide review UI test:
  - renders failed QA badge
  - renders per-slide approve, regenerate, delete request, and add request controls
  - renders disabled experimental partial edit control
- Approval gate test:
  - blocks vectorization when any slide is failed
  - blocks vectorization when any slide is not approved
  - allows vectorization when all slides are approved and QA-passed

## Manual Verification

- Run `bun run verify`.
