# Live Generation Report Lineage

Date: 2026-06-18

Ticket: DF-240

## Contract

The live generation report must preserve slide-level lineage from the approved research pack through text generation, image generation, compositor output, and final export.

Each production slide report must include:

- one lineage entry for every project slide number
- source ids used by the slide
- text turn id, text thread id, text artifact id, and text provider kind
- image request id, image artifact id, and image provider kind
- image artifact id matching the reported slide number
- prompt version
- fixture flag
- compositor PNG hash and exported PNG hash

The report renderer uses the labels `text turn`, `image request`, `prompt`, `fixture`, `compositor`, and `export` so reviewers can see the lineage without opening the project file.

## Blocking Rules

`src/lib/live-generation-report-lineage.ts` blocks final report/export readiness when any of these conditions appear:

- `missing_source_trace`: a slide has no source ids.
- `missing_slide_lineage`: one or more project slide numbers have no report lineage entry.
- `missing_text_turn`: text lineage is missing a turn id or thread id.
- `missing_text_artifact`: text lineage is missing a text artifact id.
- `missing_image_artifact`: image lineage is missing an image artifact id.
- `image_artifact_slide_mismatch`: image artifact id does not match the reported slide number.
- `missing_image_request`: image lineage is missing the provider request id.
- `missing_prompt_version`: the slide prompt version is absent.
- `invalid_compositor_hash`: compositor PNG hash is not a full SHA-256 digest.
- `invalid_export_hash`: exported PNG hash is not a full SHA-256 digest.
- `mock_lineage_contamination`: production lineage includes a mock text or image provider artifact.
- `fixture_lineage_contamination`: production lineage includes fixture content.
- `export_compositor_mismatch`: exported PNG hash does not match the compositor result hash.
- `secret_leak`: project export content contains secret-like text after redaction scan.
- `missing_live_report_lineage`: production export was requested without slide-level live report lineage.

`src/lib/final-export-gate.ts` now requires slide-level live report lineage in production mode and forwards live lineage validation failures, including `missing_slide_lineage`, `missing_text_artifact`, `missing_image_artifact`, `image_artifact_slide_mismatch`, `missing_image_request`, `invalid_compositor_hash`, `invalid_export_hash`, `mock_lineage_contamination`, `fixture_lineage_contamination`, `export_compositor_mismatch`, and `secret_leak`, into the final export gate issues.

## Local Evidence

- `src/lib/live-generation-report-lineage.test.ts` verifies the formatted report section, complete production lineage, blocked missing artifact ids, invalid export/compositor hashes, and contaminated exports.
- `src/lib/final-export-gate.test.ts` verifies that production export is blocked when slide-level live report lineage is missing, incomplete, or omits project slides and is allowed only when provider provenance plus slide report lineage are complete.
- `src/lib/generation-report.test.ts` verifies existing generation report provider provenance fields including turn id, request id, prompt version, and fixture flag.
- `src/lib/final-export-gate.test.ts` verifies the existing final export gate still blocks incomplete or contaminated export summaries.
- `src/lib/project-export.test.ts` verifies project export uses approved layout PNGs and redacts project file content.

## Remaining Live Evidence

The local contract can reject incomplete or contaminated provenance, but DF-240 still requires a real live run where the app populates this lineage from production provider turns and provider image requests. The ticket should remain open until a zero-contamination report/export bundle is produced from the real compositor output.
