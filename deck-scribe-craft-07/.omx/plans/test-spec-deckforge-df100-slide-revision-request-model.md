# Test Spec: DF-100 Slide Revision Request Model

## Automated Tests

- Edit intent parser test:
  - chart resize request changes chart area size and keeps title/source/style
  - title edit request changes title and keeps statistics/source/style
  - revision artifact id/path/hash are deterministic

## Manual Verification

- Run `bun run verify`.
