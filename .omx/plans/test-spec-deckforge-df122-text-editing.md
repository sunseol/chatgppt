# Test Spec: DF-122 Text Editing

## Automated Tests

- Text edit model test:
  - updates a selected title layer immutably
  - preserves Korean text
  - rejects locked or non-text layer edits
  - emits export-ready layer JSON containing edited text
- Editor UI integration test:
  - renders the text edit inspector for an editable text layer

## Manual Verification

- Open the editor route, select a title/body layer, enter Korean text, and confirm the canvas reflects it.
