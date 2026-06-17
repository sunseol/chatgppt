# Test Spec: DF-074 DOM Layer Metadata And Bounds

## Unit Tests
- Given valid Layout IR, when rendered to a prototype, then every layer has bounds, role, editable, source ids, and dataset ids.
- Given chart slide metadata, then dataset/source ids are preserved on chart layers.
- Given local render artifacts, then DOM layer metadata omission count is zero.
- Given a fixed fixture, coordinate output matches a snapshot of canvas-space bounds.

## Regression Checks
- `bun run lint`
- `bun run verify`
