# DF-115 Test Spec

## Unit Tests
- Given no layer models, when the gate is evaluated, then approval is blocked and a missing-layers failure is returned.
- Given slide layers with no editable layer, when evaluated, then approval is blocked and the failing slide is named.
- Given editable layers on every slide, when evaluated, then approval is allowed and metrics are returned.

## UI Tests
- Given a failed gate report, when rendered with the approval bar, then validation metrics, failure items, and a disabled approval button are visible.

## Verification Commands
- `bun test src/lib/editable-review-gate.test.ts src/components/deck/EditableReviewGatePanel.integration.test.tsx`
- `bun run lint`
- `bun run verify`
