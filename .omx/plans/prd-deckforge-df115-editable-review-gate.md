# DF-115 Editable Review Gate

Users should not enter the editor or export path until editable layer conversion has been reviewed and approved. The gate must show objective editability checks and keep failure items visible so bad SVG/layer output cannot be silently accepted.

## Scope
- Add a deterministic editable review gate report.
- Display total/editable layer counts, editability ratio, and gate status.
- List blocking failures when conversion output is missing or non-editable.
- Disable vectorize approval when the gate fails.
- Keep regeneration available for failed conversion output.

## Out of Scope
- Full SVG AST validation.
- Pixel-level visual QA.
- Rich editor interactions.

## Acceptance Criteria
- Editor/export progression is blocked until SVG/layer output passes the gate.
- Editability validation results are visible in the vectorize review step.
- Failure items are rendered explicitly.
