# Test Spec: DF-154 Manual QA Scenarios

## Regression Coverage

- `src/lib/manual-qa-doc.test.ts`
  - Verifies the manual QA document exists.
  - Verifies required scenario sections are present.
  - Verifies enough checklist items exist for a tester to execute the flow.
  - Verifies observation metrics and pass thresholds are present.
  - Verifies a QA dry-run record template is present.

## Verification Commands

- `bun test src/lib/manual-qa-doc.test.ts`
- `bun run lint`
- `bun run verify`
