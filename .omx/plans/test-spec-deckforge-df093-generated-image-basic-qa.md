# Test Spec: DF-093 Generated Image Basic QA

## Automated Tests

- Image QA mock test:
  - valid composed slide passes
  - source-less numeric overlay fails
  - wrong aspect ratio fails
- Benchmark scoring:
  - structure mismatch rate above 10% fails

## Manual Verification

- Run `bun run verify`.
