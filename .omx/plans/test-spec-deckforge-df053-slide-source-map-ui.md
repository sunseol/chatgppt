# DF-053 Test Spec

## Unit Tests

- `createSlideSourceMapReview` summarizes accepted links, rejected claims, fatal issues, and generation block state.
- `applySourceMapCorrection` immutably adds/removes claim/source/dataset links from a selected slide entry.
- `createImageGenerationSourceMapGate` blocks when the source map contains fatal source-less numeric issues.

## Component Tests

- `SourceMapReviewPanel` renders slide ids, claim/source/dataset badges, rejected claim ids, fatal issue copy, and manual correction controls.

## Regression Tests

- `buildSlideContextBundles` excludes source-less numeric claims from `facts`, so `buildSlidePromptPackage` cannot carry them into image generation.
- `buildGenerationReport` still includes the slide source map section.

## Commands

- `bun test src/lib/source-map-review.test.ts src/components/deck/SourceMapReviewPanel.integration.test.tsx src/lib/slide-context-bundle.test.ts src/lib/slide-source-map.test.ts`
- `bun run lint`
- `bun run verify`
