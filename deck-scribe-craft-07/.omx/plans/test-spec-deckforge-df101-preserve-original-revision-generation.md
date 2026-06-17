# Test Spec: DF-101 Preserve Original Revision Generation

## Unit Tests

- `generatePreservedSlideRevision` passes original image hash/data and edit instruction to the mock provider.
- Successful generation increments only the target slide version and stores a revision-generation artifact.
- A changed `mustKeep` target returns a failed result with preservation issue details.
- Before/after comparison contains stable original/revised versions, descriptors, requested changes, and preservation checks.

## Verification Commands

- `bun test src/lib/slide-revision-generation.test.ts src/lib/slide-revision-model.test.ts`
- `bun run lint`
- `bun run verify`
