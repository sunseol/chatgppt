# Test Spec: DF-015 Full Audit Log Redaction & Report Integration

## Unit Tests

- Given a regeneration event with a bearer token in the message, when an audit event is created, then the message is redacted and trace/lineage remain.
- Given a provider job with usage summary and secret-like output, when a provider summary audit event is created, then usage summary remains and provider output is absent.

## Report Integration Tests

- Given an export audit event, when the generation report is built, then section `## 11. 감사 로그` includes event id, trace id, artifact id, upstream lineage, and redacted message.

## Regression Tests

- Existing provider job audit tests still pass.
