# DF-062 Design System Editor Context

## Ticket

- DF-062. Design System Editor 구현

## Existing Surface

- DF-062A minimal review UI exists in `DesignStage` and `DesignPanels`.
- `SlidePreview` already responds to `DesignSystem` props, so local design edits can preview immediately.
- `invalidatedAfter("design")` already marks layout, generate, review, vectorize, editor, and export invalid.
- `DESIGN_APPROVAL_CTA_LABEL` already matches the required copy.

## Implementation Direction

- Add a pure `design-editor-model` for immutable color, typography, and negative-rule edits.
- Add `DesignSystemEditorPanel` with color inputs, typography number inputs, and negative-rule textarea.
- Keep edits local until saved; preview reads the local draft.
- Saving a design draft persists it and merges `invalidatedAfter("design")`.
- Approval continues to use the exact existing CTA.

## Verification

- Unit tests for editor model and invalidation patch.
- Server-rendered UI test for editor controls.
- Browser visual QA for desktop/mobile design stage.
- `bun run lint` and `bun run verify`.
