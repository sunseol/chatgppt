# PRD: DF-140 Workflow Stepper UX

## Goal

Make the workflow stepper self-explanatory enough that users can identify the current step, completed steps, locked steps, and invalidated steps without relying on icon meaning alone.

## Requirements

- Show explicit status text for current, completed, locked, available, and invalidated steps.
- Explain why a locked step is unavailable.
- Explain that invalidated steps require regeneration or re-approval.
- Show a concise next-action hint for the current or next available step.
- Preserve existing route/link behavior for reachable steps.

## Non-Goals

- Do not change workflow stage transitions.
- Do not implement long-running provider progress; that belongs to DF-141.
- Do not redesign the whole project shell.
