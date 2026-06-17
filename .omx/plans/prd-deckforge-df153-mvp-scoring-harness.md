# PRD: DF-153 MVP Scoring Harness

## Goal

Produce a repeatable Technical MVP score for each seed benchmark and vertical-slice result, then aggregate those benchmark scores into release-readiness evidence.

## Requirements

- Score workflow, interview, research, plan, design, layout, image, editable overlay, editor, and report categories.
- Return total score, 80-point pass flag, fatal issue list, release-ready flag, and per-category failure reasons.
- Aggregate multiple benchmark results with benchmark ids, average score, pass rate, and failure reasons.
- Treat fatal workflow errors as release blockers regardless of total score.

## Non-Goals

- Do not run full browser e2e flows.
- Do not expand the benchmark manifest to 30 cases.
- Do not invent subjective visual quality scores beyond existing QA signals.
