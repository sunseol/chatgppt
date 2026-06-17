# Test Spec: DF-140 Workflow Stepper UX

## Unit

- Given a project at an active workflow stage, the stepper model marks prior steps completed and the active step current.
- Given a future step, the model includes a lock reason that names the prior approval gate.
- Given an invalidated step, the model includes regeneration or re-approval guidance.

## Integration

- The rendered stepper rows include visible labels for completed, current, locked, and invalidated states.
- The rendered locked row includes the lock reason.
- The rendered invalidated row includes regeneration guidance.
