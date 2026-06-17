# PRD: DF-141 Long-Running Job Progress UI

## Goal

Give users enough trustworthy progress information for long-running AI work to understand what is happening, stop work, retry failed work, and recover the latest job state after a restart.

## Requirements

- Show the current workflow stage and provider job id.
- Show provider progress percent and sanitized progress message.
- Show cancel action for queued/running jobs.
- Show retry action for failed/cancelled jobs.
- Show generated intermediate artifact summaries from partial results.
- Show a concise sanitized failure summary without raw logs or secrets.
- Persist and restore job state by `job_id` after a browser restart.

## Non-Goals

- Do not implement real provider streaming beyond the existing mock long-running path.
- Do not expose raw provider logs or full stack traces.
- Do not change provider job manager semantics.
