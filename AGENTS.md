# GPPT / DeckForge Agent Instructions

This workspace follows an evidence-first operating model.

Before any non-trivial task, read:

- `docs/ai_worker_operating_contract.md`
- `docs/project_status_briefing_2026-06-24.md` when the task touches product direction, release readiness, or consulting context

The contract is mandatory. Do not treat it as background reading.

## Non-Negotiable Rules

- AI does not have final judgment authority.
- Documentation does not imply Done.
- AI says passed does not imply Done.
- Done requires machine-verifiable evidence.
- For `implementation`, `bugfix`, `test`, and `release` work, docs-only completion is a failure unless the user explicitly changes the task to documentation/specification.
- Final status must be tied to executable evidence: source/config/test diff, command output, runtime trace, artifact hash, screenshot hash, package hash, or CI status.
- Visual QA must use deterministic hard gates before AI review. AI visual review is only an alert channel, never a pass condition.
- Release or acceptance claims require exact source/artifact/evidence identity. Dirty-worktree local evidence can support only a local candidate, not release readiness.

## Required Task Classification

Classify non-trivial work as one of:

- `research`
- `specification`
- `implementation`
- `bugfix`
- `test`
- `release`

If the task kind is implementation-grade, maintain this state model:

```text
Proposed
-> Reproduced
-> Implemented
-> TargetVerified
-> RegressionVerified
-> Packaged
-> Accepted
```

Do not skip states in claims. If evidence only reaches `Implemented`, say candidate, not verified.

## Visual Work

For DeckForge visual work, use this order:

```text
LayoutIR validator
-> Web render under fixed environment
-> pixel / perceptual / semantic-region diff
-> EditableLayerModel validator
-> PPTX structural validator
-> PPTX real render
-> round-trip validator
-> AI defect-candidate review
-> visual mutation suite
-> human baseline review
```

Hard gates include geometry, text, asset, render, regression, stale-artifact, and package/object-graph checks.

## Planning Limit

For implementation and bugfix tasks:

- create at most one short plan before executable change
- after planning, produce one of: failing test, reproduction script, source/config/test diff, or execution trace
- do not create a second planning/report document before executable work unless the user explicitly requested docs only

## Final Response Requirements

For implementation-grade work, report:

- changed files
- executable behavior changed
- targeted verification
- regression verification
- user-surface artifact or why not applicable
- known gaps

For documentation-only work, say clearly that no runtime behavior changed.
