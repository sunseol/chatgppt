# DF-112A Test Spec

## Unit Tests
- Given canonical DOM text and a conflicting OCR candidate, when OCR hints are built, then resolved text remains canonical and the hint requires review.
- Given a correction dictionary entry, when an OCR candidate is compared, then the corrected candidate text is used for comparison while the dictionary remains user-editable output data.
- Given `ocrEngine: "none"` with no candidates, when hints are built, then the pipeline remains available and canonical text is preserved.

## Verification Commands
- `bun test src/lib/ocr-candidate-hints.test.ts`
- `bun run lint`
- `bun run verify`
