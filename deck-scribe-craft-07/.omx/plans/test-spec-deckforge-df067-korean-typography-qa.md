# Test Spec: DF-067 Korean Typography QA

## Unit Tests
- Given benchmark reconstructed layers with Korean title/body/source and mixed number text, when the benchmark runs, then it passes with zero corrupted layers and confirms mixed text/source coverage.
- Given a layer with a replacement character, when the benchmark runs, then it fails with a `corrupted-text` issue for that layer.
- Given caption/source text below the minimum readable size or line-height, when the benchmark runs, then it fails with typed size/line-height issues.

## Regression Targets
- `validateKoreanTextIntegrity` continues to detect replacement characters.
- DF-066 font policy and manager tests continue to pass.

## Visual Smoke
- If frontend surfaces are touched, run a Korean sample deck in mobile width and check no replacement characters or horizontal overflow.
