# Test Spec: DF-112 Text And Font Reconstruction

## Automated Tests

- Reconstruction test:
  - reconstructs title/body/source text with role-aware font candidates
  - scores title >= 0.95 and body >= 0.85 for a benchmark deck
  - detects replacement-character Korean corruption
- Font fallback test:
  - uses Korean-safe title/body/source fallback stacks without remote URLs

## Manual Verification

- Run `bun run verify`.
