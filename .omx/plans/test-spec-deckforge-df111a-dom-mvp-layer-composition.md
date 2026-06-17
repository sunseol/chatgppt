# Test Spec: DF-111A DOM MVP Layer Composition

## Automated Tests

- Editable overlay composition test:
  - composes title, body, source, and chart layers from DOM layer metadata
  - preserves source layer id and bounds
  - links chart layer to chart overlay id, dataset ids, and source map ids
- Benchmark editability scoring:
  - title editable rate is 100% on the benchmark fixture
  - body editable rate is 100% on the benchmark fixture
  - score reports Level 2 readiness

## Manual Verification

- Run `bun run verify`.
