# PRD: DF-122 Text Editing

## Problem

Text editing must update the editable layer model, preserve Korean input, and feed downstream export data instead of only changing a temporary preview.

## Requirements

- Apply text edits to editable text layers immutably.
- Reject edits to locked or non-text layers.
- Preserve Korean strings exactly.
- Produce export-ready layer data after edits.

## Acceptance

- Title and body text can be updated.
- Korean text is not corrupted.
- Edited text appears in canvas render output and serialized export data.
