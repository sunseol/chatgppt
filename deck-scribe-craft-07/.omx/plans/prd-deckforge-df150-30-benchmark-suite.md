# PRD: DF-150 Full 30 Benchmark Suite

## Goal

DeckForge has a 30-case benchmark manifest that can drive release QA across the major user request categories expected for the MVP.

## Acceptance Criteria

- The manifest contains exactly 30 benchmark cases.
- The suite covers all required categories.
- Each benchmark has an initial prompt.
- Each benchmark has expected verification points.
- At least 80% of the suite is evaluable by deterministic manifest validation.

## Non-goals

- Do not execute all benchmark cases in this ticket.
- Do not add CI orchestration; DF-151 covers suite execution.
- Do not replace the existing MVP scoring harness.

