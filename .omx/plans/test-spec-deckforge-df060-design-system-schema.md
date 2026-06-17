# DF-060 Test Spec

## Schema Tests

- A complete design system parses.
- Unsafe typography bounds are rejected.
- Approved artifacts freeze nested design-system arrays and objects.

## Propagation Tests

- Layout IR prompt includes design negative rules.
- Slide context bundle carries design negative rules.
- Slide prompt package includes design negative rules in the approved design section and negative constraints.

## Commands

- `bun test src/lib/design-system.test.ts src/lib/layout-ir-prompt.test.ts src/lib/slide-context-bundle.test.ts src/lib/slide-prompt-package.test.ts`
- `bun run lint`
- `bun run verify`
