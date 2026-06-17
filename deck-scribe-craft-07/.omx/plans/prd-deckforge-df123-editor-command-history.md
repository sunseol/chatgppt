# DF-123 Editor Command History

DeckForge needs safe editor commands for common object operations. The command model should preserve undo/redo history and reject invalid operations without corrupting the current layer graph.

## Scope
- Add a pure editor command history model.
- Support duplicate, delete, group, and ungroup commands.
- Support undo and redo stacks.
- Preserve current work on rejected commands.

## Out of Scope
- Multi-select UI.
- Keyboard shortcuts.
- Rich group transform behavior.

## Acceptance Criteria
- Undo/redo restores previous and next layer graphs.
- Duplicate/delete/group/ungroup commands update editable layers.
- Invalid or locked-layer commands return a rejection and keep the current layer graph unchanged.
