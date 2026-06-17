# Test Spec: DF-075 Layout Validation

## Unit Tests
- Given valid local render artifacts, when validated, then the report passes with 100% render success and zero overflow/safe-margin breach rates.
- Given an artifact with missing rendered slide output, when validated, then render success rate falls below 100% and the report fails.
- Given out-of-canvas layer bounds, when validated, then overflow slide rate is calculated and the report fails above threshold.
- Given safe margin violations, when validated, then safe margin breach rate is calculated and the report fails above threshold.

## Benchmark Report
- Given the mock benchmark deck, report summary is deterministic and snapshot-tested.

## Regression Checks
- `bun run lint`
- `bun run verify`
