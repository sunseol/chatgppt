# Test Spec: DF-090 Slide Generation Queue

## Automated Tests

- Queue integration test:
  - builds one provider job per slide bundle
  - respects `maxParallel`
  - passes shared Deck Context, design hash, and layout id to every worker
  - emits 100% final progress
- Partial failure test:
  - one failed slide returns `partial_failure`
  - successful slide outputs remain available
  - failed slide exposes retryable user error metadata
- Context mismatch test:
  - mixed Deck Context or layout ids block the queue before provider work starts

## Manual Verification

- Run `bun run verify`.
