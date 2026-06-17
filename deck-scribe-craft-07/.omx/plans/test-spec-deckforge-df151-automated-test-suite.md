# Test Spec: DF-151 Automated Test Suite

## Regression Coverage

- `src/lib/automated-test-suite.test.ts`
  - Verifies all required suite stages are present.
  - Verifies every target has artifact id, command, and test files.
  - Verifies failure formatting includes stage and artifact id.
  - Verifies the suite command is `bun run test:suite` and mock-provider runnable.

## Verification Commands

- `bun test src/lib/automated-test-suite.test.ts`
- `bun run test:suite`
- `bun run lint`
- `bun run verify`

