# DF-061 Test Spec

## Generator Tests

- Approved plan returns `kind: "ready"` and one valid `DesignSystem`.
- All slide refs point to the same `designSystemId`.
- Mandatory negative rules are present.
- Unapproved plan returns `kind: "blocked"`.

## Gate Tests

- `canGenerateLayoutPrototype` returns false until the design has `approvedHash`.
- `buildLayoutIrPrompt` blocks until both plan and design are approved.

## Commands

- `bun test src/lib/design-system-generator.test.ts src/lib/workflow-engine.test.ts src/lib/layout-ir-prompt.test.ts src/lib/design-system.test.ts`
- `bun run lint`
- `bun run verify`
