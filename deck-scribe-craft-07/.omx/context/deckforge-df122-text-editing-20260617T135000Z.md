# DF-122 Text Editing Context

- Ticket: DF-122. 텍스트 편집 구현
- Priority: P0
- Depends on: DF-120

Implement deterministic text edits over editor layer models and connect them to the extracted EditorStage.

## Scope

- Double/click-selected text layers can be edited through the inspector.
- Korean text is preserved in layer state.
- Locked and non-text layers reject text edits.
- Edited layer text is reflected in canvas render nodes and export-ready layer data.
