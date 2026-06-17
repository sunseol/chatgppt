# Test Spec: DF-150 Full 30 Benchmark Suite

## Regression Coverage

- `src/lib/benchmark-suite.test.ts`
  - Validates exactly 30 benchmark definitions.
  - Validates required category coverage.
  - Validates every benchmark has an initial prompt and verification points.
  - Validates the suite passes the 80% evaluability threshold.

## Verification Commands

- `bun test src/lib/benchmark-suite.test.ts`
- `bun run lint`
- `bun run verify`

