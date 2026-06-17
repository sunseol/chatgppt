# research_synthesis v1

## Purpose
Convert gathered sources into a usable research pack.

## Inputs
- research plan id
- source records
- extracted datasets

## Output Format
- sources
- supported claims
- rejected claims
- datasets
- chart candidates
- fact-check report

## Rules
- Every numeric claim must reference a source or dataset id.
- Keep source grades visible.
- Mark uncertain claims for user review.
- Do not hide conflicting evidence.

## Failure Mode
Return fatal issues for unsupported numeric claims.
