# Test Spec: DF-132 Generation Report

## Unit

- Given a fully populated project, when the generation report is built, then each slide includes plan/source/design/layout/editable/generated lineage.
- Given export summary, when the report is built, then artifact id/hash/path and PNG count appear.
- Given layout validation failure, fact-check issues, and uncertain claims, when the report is built, then those risks appear in the report.

## Regression

- Existing source map and prompt version report assertions remain valid.
