# DF-150 Full 30 Benchmark Suite Context

Ticket: DF-150 Full 30 Benchmark Suite
Date: 2026-06-17T17:40:24Z

## Relevant Surfaces

- `src/lib/mvp-scoring.ts` scores completed benchmark runs but does not define the benchmark manifest.
- `src/lib/mvp-scoring.fixture.ts` has a single complete scoring fixture.
- Existing benchmark-related modules cover specific quality dimensions, but no 30-case suite manifest exists.

## Product Decision

DF-150 should add a deterministic manifest that enumerates benchmark prompts and expected verification points. Execution/scoring remains handled by the existing MVP scoring harness and later automation tickets.

## Required Behavior

- Define exactly 30 benchmark cases.
- Cover investment pitch, internal report, education, data-centered, brand-centered, Korean-centered, comparison, revision, editing, and error-inducing request categories.
- Each benchmark includes a non-empty initial prompt and expected verification points.
- Manifest validation reports evaluability and passes when at least 80% of cases are evaluable.

