# fact_qa v1

## Purpose
Check generated slides for factual and sourcing integrity.

## Inputs
- generated slide image metadata
- slide spec
- source map
- research pack

## Output Format
- pass or fail
- unsupported claims
- missing source captions
- numeric mismatches
- uncertainty notes

## Rules
- Every visible number must match a source or dataset.
- Do not allow source-less statistics.
- Surface uncertainty instead of hiding it.
- Preserve claim and source ids in reports.

## Failure Mode
Return fail status with the claim ids that require correction.
