# DF-112A OCR Candidate Importer as Review Hints

DeckForge needs to consume PNG2SVG OCR/text candidates without letting OCR overwrite canonical text from Slide Spec or DOM layer metadata. OCR is useful for review and QA, but generated slide text must stay grounded in the approved deck model.

## Scope
- Import OCR text candidates into a deterministic review-hint report.
- Preserve canonical Slide Spec / DOM text as the resolved text output.
- Mark OCR conflicts as `review_required`.
- Treat no-OCR runs as pipeline-available with a limitation note, not a failure.
- Expose OCR correction dictionary entries as user-editable structured data.

## Out of Scope
- Running OCR.
- Replacing text reconstruction with OCR.
- UI for editing the correction dictionary.
- Fuzzy geometric OCR-to-layer matching beyond explicit source-layer mapping.

## Acceptance Criteria
- Canonical Slide Spec / DOM text wins over OCR candidates.
- OCR conflicts produce review-required hints.
- `ocrEngine: "none"` returns a passing, pipeline-available report.
- Correction dictionary entries are retained as user-editable data and applied before comparison.
