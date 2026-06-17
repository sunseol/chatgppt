# DF-151A PNG2SVG Regression Corpus Context

Ticket: DF-151A PNG2SVG Regression Corpus
Date: 2026-06-17T17:48:06Z

## Relevant Surfaces

- `src/lib/png2svg-adapter-spike.ts` defines the current PNG2SVG adapter output contract: PNG path, SVG path, optional hybrid SVG path, text candidates, visual regions, and raster regions.
- `src/lib/png2svg-visual-region-detector.ts` consumes those regions and expects stable source layer ids.
- `src/lib/benchmark-suite.ts` defines the 30-case DeckForge benchmark manifest added by DF-150.
- DF-151 added a manifest-driven automated test suite, but it does not yet define a PNG2SVG fixture corpus.

## Product Decision

DF-151A should add a deterministic corpus manifest and diff-report builder rather than checking in heavy binary PNG fixtures. The MVP web app stores artifacts by local project paths, so the corpus can lock original PNG paths, expected manifest/SVG/hybrid paths, expected metadata counts, failure conditions, manual QA notes, and comparison hashes.

## Required Behavior

- Corpus has at least 20 fixtures sourced from manual PNG2SVG cases and DeckForge benchmark images.
- Each fixture records original PNG, expected manifest, expected editable SVG, expected hybrid-safe SVG, failure conditions, and manual QA notes.
- Validation reports coverage for text candidates, raster regions, visual regions, and hybrid-safe output.
- Diff report emits per-fixture visual and metadata diff records so adapter changes can be reviewed fixture by fixture.
