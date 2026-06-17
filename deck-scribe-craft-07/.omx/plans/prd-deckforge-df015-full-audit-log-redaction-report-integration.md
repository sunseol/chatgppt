# PRD: DF-015 Full Audit Log Redaction & Report Integration

## Problem

The minimal provider job audit event is not enough for release-quality traceability. Users and developers need an audit log that ties major workflow events to trace ids, related artifacts, usage summaries, and the final generation report without leaking secrets.

## Scope

- Add a common audit event model.
- Support regeneration, revision, export, provider job summary, artifact, approval, and stage transition event types.
- Preserve trace id, stage, timestamp, event id, and artifact lineage.
- Redact sensitive event messages.
- Include provider usage/cost summary without provider output.
- Reference audit log events in the final generation report.

## Acceptance Criteria

- Major events can carry trace id and related artifact lineage.
- Cost/usage summaries are recorded without sensitive provider output.
- The final report references audit log entries.

## Non-Goals

- Persistent JSONL file storage.
- Remote log upload.
- Cryptographic signing of audit logs.
