# DF-062 Test Spec

## Unit Tests

- Updating a color token returns a new design and preserves the original.
- Updating typography min/max returns a new design.
- Parsing negative-rule text trims blank lines.
- `createDesignDraftUpdate` returns design downstream invalidation flags.

## UI Tests

- Editor panel renders color token controls, typography controls, negative-rule textarea, save button, and exact approval CTA remains available through `GateBar`.

## Visual QA

- Open the design stage with an editable design draft.
- Verify desktop and mobile render without horizontal overflow.
- Confirm editor panel, preview, and save control are visible.

## Commands

- `bun test src/lib/design-editor-model.test.ts src/components/deck/DesignStage.integration.test.tsx src/lib/workflow-engine.test.ts`
- `bun run lint`
- `bun run verify`
