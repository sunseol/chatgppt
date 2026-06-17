# DF-123 Editor Command History Context

## Task Statement
Implement DF-123 editor command history and object operations: undo/redo, duplicate, delete, group, and ungroup.

## Desired Outcome
- Core editor operations are deterministic pure functions.
- Undo/redo preserves edit history.
- Rejected commands leave the current layer graph unchanged.

## Known Facts / Evidence
- DF-121 provides move/resize transforms.
- DF-122 provides text edit transforms.
- `EditableLayerModel` is the editor surface data shape used by `EditorStage`.

## Constraints
- Keep command logic independent from React UI state.
- Do not mutate existing layer arrays or layer objects.
- TypeScript edits must remain strict and below OMO size limits.

## Unknowns / Open Questions
- Multi-select UI for group commands is outside this ticket.
- Future command integration can wrap existing move/resize/text edit outputs.

## Likely Codebase Touchpoints
- `src/lib/deck-types.ts`
- New `src/lib/editor-command-history.ts`
- New `src/lib/editor-command-history.test.ts`
