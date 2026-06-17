# Test Spec: DF-151A PNG2SVG Regression Corpus

## Regression Coverage

- `src/lib/png2svg-regression-corpus.test.ts`
  - Verifies the corpus has at least 20 unique fixtures.
  - Verifies every fixture has original PNG, expected manifest, expected SVG, expected hybrid SVG, failure conditions, and manual QA notes.
  - Verifies validation coverage for text candidates, raster regions, visual regions, and hybrid-safe results.
  - Verifies the diff report emits visual and metadata diff records per fixture.
  - Verifies changed actual metadata and visual hashes are surfaced as changed fixture diffs.

## Verification Commands

- `bun test src/lib/png2svg-regression-corpus.test.ts`
- `bun run lint`
- `bun run verify`
