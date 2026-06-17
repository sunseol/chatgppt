# Test Spec: DF-103 Revision Mask & Delta Checker

## Unit Tests

- Low `must_keep` delta and clear `must_change` delta passes.
- Large `must_keep` delta fails and recommends re-revision.
- Missing or tiny requested-change delta warns and creates an approval-warning candidate.
- History entry stores revision id, versions, summary metrics, and issues.

## Verification Commands

- `bun test src/lib/revision-delta-checker.test.ts`
- `bun run lint`
- `bun run verify`
