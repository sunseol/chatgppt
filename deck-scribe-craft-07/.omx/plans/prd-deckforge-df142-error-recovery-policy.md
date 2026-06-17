# PRD: DF-142 Error Recovery Policy

## Goal

Convert provider, render, save, and transform failures into consistent user-facing errors that say where the failure happened, why it happened, whether retry is available, and what recovery action is safest.

## Requirements

- Represent workflow errors with stage, kind, cause, retryability, recovery action, and final-approval blocking flag.
- Redact sensitive text and avoid raw stack traces in user-facing causes.
- Preserve a serializable draft recovery snapshot for save failures.
- Render errors in a reusable UI panel with retry guidance.
- Block final export when a fatal or approval-blocking workflow error remains.

## Non-Goals

- Do not implement full telemetry or remote logging.
- Do not add cloud sync or conflict resolution.
- Do not replace every existing stage with a new error boundary in this ticket.
