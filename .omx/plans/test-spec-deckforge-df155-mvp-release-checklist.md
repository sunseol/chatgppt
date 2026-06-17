# Test Spec: DF-155 MVP Release Checklist

## Regression Coverage

- `src/lib/release-checklist-doc.test.ts`
  - Verifies the release checklist document exists.
  - Verifies every P0 ticket ID from the backlog is present.
  - Verifies unverified items and release blockers are separate sections.
  - Verifies final report sample and benchmark result locations are recorded.
  - Verifies functional, quality, user, security, and packaging gates are present.

## Verification Commands

- `bun test src/lib/release-checklist-doc.test.ts`
- `bun run lint`
- `bun run verify`
