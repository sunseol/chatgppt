# Test Spec: DF-071 Layout IR Prompt

## Unit Tests
- Given an approved plan and approved design system, when a Layout IR prompt package is built, then it contains the allowed component catalog and a schema-bound JSON-only output contract.
- Given unapproved plan or design inputs, when prompt creation is attempted, then it returns blocked issues instead of a prompt.
- Given valid candidate Layout IR output, when parsed, then it returns the validated IR.
- Given candidate output with arbitrary CSS/style/unknown fields, when parsed, then schema validation fails.

## Snapshot Checks
- Prompt text includes the draft metadata requirement and the explicit forbidden surfaces list.
- Prompt text includes per-slide allowed component and slot constraints.

## Regression Checks
- `bun run lint`
- `bun run verify`
