# Test Spec: DF-142 Error Recovery Policy

## Unit

- Given provider/render/transform failures, the policy returns stage, sanitized cause, retryability, and recovery action.
- Given a save failure with a draft payload, the policy returns a draft recovery snapshot.
- Given a fatal workflow error on a project, the final export gate blocks approval.

## Integration

- The error panel renders stage, cause, retryability, and recovery action.
- Layout render failures render through the actionable error panel.

## Failure Injection

- Inject a raw multiline provider failure and verify no stack trace or secret-like text is rendered.
- Inject a save failure and verify the draft is represented in the recovery snapshot.
- Inject a fatal transform failure and verify final export is blocked.
