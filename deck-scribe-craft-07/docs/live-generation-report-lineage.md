# Live Generation Report Lineage

Date: 2026-06-18

Ticket: DF-240

## Contract

The live generation report must preserve slide-level lineage from the approved research pack through text generation, image generation, compositor output, and final export.

Each production slide report must include:

- one lineage entry for every project slide number
- no duplicate slide lineage rows
- nonblank source ids used by the slide
- nonblank text turn id, text thread id, text artifact id, and text provider kind
- nonblank image request id, image artifact id, and image provider kind
- text and image artifact ids that exist in provider provenance
- text turn/thread ids and image request ids that match provider provenance
- text artifacts from authenticated Codex session provenance and image artifacts from API key image-provider provenance
- unique image request ids across slide lineage rows
- image artifact id matching the reported slide number
- prompt version
- fixture flag
- compositor PNG hash and exported PNG hash
- exported project content without mock-mode or fixture markers

`buildGenerationReport` appends the formatted `## Live Slide Lineage` section when supplied with verified live report lineage. The report renderer uses the labels `text turn`, `image request`, `prompt`, `fixture`, `compositor`, and `export` so reviewers can see the lineage without opening the project file.

## Blocking Rules

`src/lib/live-generation-report-lineage.ts` blocks final report/export readiness when any of these conditions appear:

- `missing_source_trace`: a slide has no nonblank source ids.
- `missing_slide_lineage`: one or more project slide numbers have no report lineage entry.
- `duplicate_slide_lineage`: a project slide number appears in more than one report lineage entry.
- `missing_text_turn`: text lineage is missing a nonblank turn id or thread id.
- `missing_text_artifact`: text lineage is missing a text artifact id.
- `missing_image_artifact`: image lineage is missing an image artifact id.
- `image_artifact_slide_mismatch`: image artifact id does not match the reported slide number.
- `missing_image_request`: image lineage is missing the nonblank provider request id.
- `duplicate_image_request`: an image provider request id is reused across slide lineage entries.
- `missing_text_provider_lineage`: text artifact id is absent from provider provenance.
- `missing_image_provider_lineage`: image artifact id is absent from provider provenance.
- `text_provider_auth_mismatch`: text provider provenance is not from an authenticated Codex session.
- `image_provider_auth_mismatch`: image provider provenance is not from API key image-provider auth.
- `text_provider_lineage_mismatch`: text turn/thread lineage differs from provider provenance.
- `image_provider_lineage_mismatch`: image request lineage differs from provider provenance.
- `missing_live_report_lineage_section`: validated sidecar lineage was supplied to the production export gate but the report markdown does not contain the formatted `## Live Slide Lineage` section.
- `missing_prompt_version`: the slide prompt version is absent.
- `invalid_compositor_hash`: compositor PNG hash is not a full SHA-256 digest.
- `invalid_export_hash`: exported PNG hash is not a full SHA-256 digest.
- `mock_lineage_contamination`: production lineage includes a mock text or image provider artifact, or exported project content retains mock-mode markers.
- `fixture_lineage_contamination`: production lineage includes fixture content, or exported project content retains fixture paths/flags.
- `export_compositor_mismatch`: exported PNG hash does not match the compositor result hash.
- `secret_leak`: project export content contains secret-like text after redaction scan.
- `missing_live_report_lineage`: production export was requested without slide-level live report lineage.

`src/lib/final-export-gate.ts` now requires slide-level live report lineage in production mode, requires that validated lineage to appear in the report markdown, and forwards live lineage validation failures, including `missing_slide_lineage`, `duplicate_slide_lineage`, `missing_text_artifact`, `missing_image_artifact`, `image_artifact_slide_mismatch`, `missing_image_request`, `duplicate_image_request`, `missing_text_provider_lineage`, `missing_image_provider_lineage`, `text_provider_auth_mismatch`, `image_provider_auth_mismatch`, `text_provider_lineage_mismatch`, `image_provider_lineage_mismatch`, `missing_live_report_lineage_section`, `invalid_compositor_hash`, `invalid_export_hash`, `mock_lineage_contamination`, `fixture_lineage_contamination`, `export_compositor_mismatch`, and `secret_leak`, into the final export gate issues.

## Local Evidence

- `src/lib/live-generation-report-lineage.test.ts` verifies the formatted report section, complete production lineage, blocked missing or blank evidence ids, invalid export/compositor hashes, duplicate slide rows, reused image request ids, contaminated exported project content, and contaminated exports.
- `src/lib/final-export-gate-live-lineage.test.ts` and `src/lib/final-export-gate-live-lineage-auth.test.ts` verify that production export is blocked when slide-level live report lineage is missing, incomplete, omits project slides, reuses image request evidence, references provider artifacts that are absent from provider provenance, lacks authenticated text/image provider auth, or disagrees with provider turn/request metadata, and is allowed only when provider provenance plus slide report lineage are complete.
- `src/lib/final-export-gate-live-lineage-report-section.test.ts` verifies that production export is blocked when verified sidecar lineage is absent from the report markdown.
- `src/lib/generation-report-live-lineage.test.ts` verifies that `buildGenerationReport` appends the formatted `## Live Slide Lineage` section when live lineage is supplied.
- `src/lib/generation-report.test.ts` verifies existing generation report provider provenance fields including turn id, request id, prompt version, and fixture flag.
- `src/lib/final-export-gate.test.ts` verifies the existing final export gate still blocks incomplete or contaminated export summaries.
- `src/lib/project-export.test.ts` verifies project export uses approved layout PNGs and redacts project file content.

## Remaining Live Evidence

The local contract can reject incomplete or contaminated provenance, but DF-240 still requires a real live run where the app populates this lineage from production provider turns and provider image requests. The ticket should remain open until a zero-contamination report/export bundle is produced from the real compositor output.
