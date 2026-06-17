# DF-112A OCR Candidate Review Hints Context

## Task Statement
Implement DF-112A so PNG2SVG OCR/text candidate output is imported as QA/review hints, not as a source of restored slide text.

## Desired Outcome
- Slide Spec and DOM layer metadata text remains authoritative.
- Conflicting OCR candidates require review.
- `ocrEngine: "none"` continues the generated slide pipeline.
- OCR correction dictionary is represented as user-editable data.

## Known Facts / Evidence
- DF-111C defines `Png2SvgTextCandidate` and allows `ocrEngine: "none"`.
- DF-111B already keeps existing DOM text layers authoritative during advanced layer matching.
- DF-112 reconstructs text/font candidates from existing editable text layers.

## Constraints
- Do not run or bundle external PNG2SVG/OCR code.
- Keep OCR candidates as hints only.
- TypeScript edits must be strict: no `any`, no non-null assertions, no type assertions.

## Unknowns / Open Questions
- Future UI placement for editable OCR correction settings is not defined in this ticket.
- Exact OCR-to-DOM matching algorithm can evolve; this ticket needs a deterministic import contract.

## Likely Codebase Touchpoints
- `src/lib/png2svg-adapter-spike.ts`
- `src/lib/advanced-layer-matching.ts`
- New `src/lib/ocr-candidate-hints.ts`
- New `src/lib/ocr-candidate-hints.test.ts`
