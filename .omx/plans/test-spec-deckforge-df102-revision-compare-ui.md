# Test Spec: DF-102 Revision Compare UI

## Integration Tests

- `RevisionComparePanel` renders before/after version labels, summary, requested changes, and action buttons.
- Changed or missing preservation checks show unintended-change risk.
- Clean preservation checks do not show the risk warning.

## Verification Commands

- `bun test src/components/deck/RevisionComparePanel.integration.test.tsx`
- `bun run lint`
- `bun run verify`
