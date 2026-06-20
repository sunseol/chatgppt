# Live Generation Report Lineage

Date: 2026-06-18

Ticket: DF-240

## Contract

The live generation report must preserve slide-level lineage from the approved research pack through text generation, image generation, compositor output, and final export.

Each production slide report must include:

- one lineage entry for every project slide number
- no duplicate slide lineage rows
- nonblank source ids used by the slide, with no blank or duplicate source id entries
- nonblank text turn id, text thread id, text artifact id, text prompt version, and text provider kind
- nonblank image request id, image artifact id, and image provider kind
- unique text turn ids across slide lineage rows
- unique text and image artifact ids across slide lineage rows
- text and image artifact ids that exist in provider provenance
- text turn/thread ids, text prompt version, and image turn ids that match provider provenance
- text artifacts and image artifacts from authenticated Codex session provenance
- unique image turn ids across slide lineage rows
- unique exported PNG hashes across slide lineage rows
- image artifact id matching the reported slide number
- text prompt version and image prompt version
- fixture flag
- compositor PNG hash and exported PNG hash
- sidecar lineage fields, exported project content, and report markdown without raw secret-like text
- exported project content without mock-mode or fixture markers
- a production export package summary whose artifact hash is a full SHA-256 digest and whose export/project paths are observed non-synthetic, non-local JSON evidence, not template/sample/example/placeholder paths

`buildGenerationReport` appends the formatted `## Live Slide Lineage` section when supplied with verified live report lineage. The report renderer uses the labels `text turn`, `image request`, `prompt`, `fixture`, `compositor`, and `export` so reviewers can see both text and image prompt lineage without opening the project file.

## Blocking Rules

`src/lib/live-generation-report-lineage.ts` blocks final report/export readiness when any of these conditions appear:

- `missing_source_trace`: a slide has no nonblank source ids, or a source id list mixes real ids with blank or duplicate entries.
- `missing_slide_lineage`: one or more project slide numbers have no report lineage entry.
- `duplicate_slide_lineage`: a project slide number appears in more than one report lineage entry.
- `missing_text_turn`: text lineage is missing a nonblank turn id or thread id.
- `duplicate_text_turn`: a text turn id is reused across slide lineage entries.
- `missing_text_prompt_version`: text lineage is missing the prompt version used for the text artifact.
- `missing_text_artifact`: text lineage is missing a text artifact id.
- `duplicate_text_artifact`: a text artifact id is reused across slide lineage entries.
- `missing_image_artifact`: image lineage is missing an image artifact id.
- `duplicate_image_artifact`: an image artifact id is reused across slide lineage entries.
- `image_artifact_slide_mismatch`: image artifact id is not a versioned `*_image_slide_###_vN` artifact id for the reported slide number.
- `missing_image_request`: image lineage is missing the nonblank provider turn id.
- `duplicate_image_request`: an image provider turn id is reused across slide lineage entries.
- `duplicate_export_hash`: an exported PNG hash is reused across slide lineage entries.
- `missing_text_provider_lineage`: text artifact id is absent from provider provenance.
- `missing_image_provider_lineage`: image artifact id is absent from provider provenance.
- `text_provider_auth_mismatch`: text provider provenance is not from an authenticated Codex session.
- `image_provider_auth_mismatch`: image provider provenance is not from authenticated Codex image generation.
- `text_provider_lineage_mismatch`: text turn/thread lineage differs from provider provenance.
- `text_prompt_version_mismatch`: text prompt version differs from provider provenance.
- `image_provider_lineage_mismatch`: image request lineage differs from provider provenance.
- `missing_live_report_lineage_section`: validated sidecar lineage was supplied to the production export gate but the report markdown does not contain the formatted `## Live Slide Lineage` section.
- `missing_prompt_version`: the slide prompt version is absent.
- `invalid_compositor_hash`: compositor PNG hash is not a full SHA-256 digest.
- `invalid_export_hash`: exported PNG hash is not a full SHA-256 digest.
- `mock_lineage_contamination`: production lineage includes a mock text or image provider artifact, or exported project content retains mock-mode markers.
- `fixture_lineage_contamination`: production lineage includes fixture content, or exported project content retains fixture paths/flags.
- `export_compositor_mismatch`: exported PNG hash does not match the compositor result hash.
- `secret_leak`: sidecar lineage fields, project export content, or generation report markdown contains secret-like text after redaction scan.
- `missing_live_report_lineage`: production export was requested without slide-level live report lineage.
- `invalid_export_artifact_path`: production export package path is missing, synthetic, developer-local, or marked as template/sample/example/placeholder evidence.
- `invalid_project_file_path`: production project file path is synthetic, developer-local, or marked as template/sample/example/placeholder evidence.
- `invalid_export_artifact_hash`: production export package summary does not carry a full SHA-256 artifact digest.

`src/lib/final-export-gate.ts` now requires slide-level live report lineage in production mode, requires that validated lineage to appear in the report markdown, blocks production export summaries with non-digest artifact hashes or unobserved export/project JSON paths, blocks secret-like report markdown through `src/lib/final-export-report-gate.ts`, and forwards live lineage validation failures, including `missing_slide_lineage`, `duplicate_slide_lineage`, `missing_text_turn`, `duplicate_text_turn`, `missing_text_artifact`, `duplicate_text_artifact`, `missing_text_prompt_version`, `missing_image_artifact`, `duplicate_image_artifact`, `image_artifact_slide_mismatch`, `missing_image_request`, `duplicate_image_request`, `duplicate_export_hash`, `missing_text_provider_lineage`, `missing_image_provider_lineage`, `text_provider_auth_mismatch`, `image_provider_auth_mismatch`, `text_provider_lineage_mismatch`, `text_prompt_version_mismatch`, `image_provider_lineage_mismatch`, `missing_live_report_lineage_section`, `invalid_compositor_hash`, `invalid_export_hash`, `invalid_export_artifact_path`, `invalid_project_file_path`, `invalid_export_artifact_hash`, `mock_lineage_contamination`, `fixture_lineage_contamination`, `export_compositor_mismatch`, and `secret_leak`, into the final export gate issues.

## Local Evidence

- `src/lib/live-generation-report-lineage.test.ts` verifies the formatted report section, complete production lineage, blocked missing or blank evidence ids, mixed blank source ids, duplicate source ids, missing text prompt version evidence, invalid export/compositor hashes, duplicate slide rows, reused image turn ids, sidecar lineage secret leakage, contaminated exported project content, and contaminated exports.
- `src/lib/live-generation-report-artifact-identity.test.ts` verifies that malformed image artifact ids plus reused text turn, text artifact, image artifact id, or exported PNG hash evidence cannot satisfy slide lineage rows.
- `src/lib/final-export-gate-live-lineage.test.ts`, `src/lib/final-export-gate-live-lineage-auth.test.ts`, `src/lib/final-export-gate-live-lineage-text-prompt.test.ts`, and `src/lib/final-export-gate-export-path.test.ts` verify that production export is blocked when slide-level live report lineage is missing, incomplete, omits project slides, reuses image request evidence, references provider artifacts that are absent from provider provenance, lacks authenticated text/image provider auth, has a non-digest export artifact hash, carries template/sample/example/placeholder export package paths, disagrees with provider turn/request metadata, or disagrees with text prompt version provenance, and is allowed only when provider provenance plus slide report lineage are complete.
- `src/lib/final-export-gate-live-lineage-report-section.test.ts` verifies that production export is blocked when verified sidecar lineage is absent from the report markdown.
- `src/lib/generation-report-live-lineage.test.ts` verifies that `buildGenerationReport` appends the formatted `## Live Slide Lineage` section when live lineage is supplied.
- `src/lib/generation-report.test.ts` verifies existing generation report provider provenance fields including turn id, request id, prompt version, and fixture flag.
- `src/lib/final-export-gate.test.ts` verifies the existing final export gate still blocks incomplete or contaminated export summaries and production generation reports that leak raw secrets.
- `src/lib/project-export.test.ts` verifies project export uses approved layout PNGs and redacts project file content.

## Live Image Evidence Update

2026-06-21 KST Lane B produced real Codex image lineage that can feed the slide-level report:

- Single route-lock image evidence: `docs/live-evidence/codex-image/df230-df231-live-artifact-summary.json`
- Five background batch evidence: `docs/live-evidence/codex-image/df232-five-background-protocol-summary.json`
- Selected-slide regeneration evidence: `docs/live-evidence/codex-image/df235-selected-slide-regeneration-summary.json`
- Five background artifact ids: `df232_live_codex_batch_image_slide_001_v1` through `df232_live_codex_batch_image_slide_005_v1`
- Five background image turns: `019ee689-3af0-7891-83f5-2f386f43c181`, `019ee68a-214d-7be2-8984-b3461b1cf8db`, `019ee68a-e53e-71c0-814a-8d5da527c75a`, `019ee68b-5d5c-7a62-bf39-ae1c19bf4c41`, `019ee68b-cf93-7dd3-9a6a-2a25cb63205a`
- Regeneration image turn: `019ee690-9801-71b0-9062-cc72a74d2f97`
- Provider/auth for all image sidecars: `codex` / `codex_session`
- Fixture flag for all image sidecars: `false`

DF-240 remains open because a zero-contamination generation report and final export bundle still require production Codex text-turn lineage, compositor output hashes, exported PNG hashes, and packaged export QA. The image provider side is now live; the report/export surface has not yet been driven end to end.

## Lane D Image/Compositor Export Recheck

2026-06-21 KST Lane D added partial image/compositor/export lineage evidence:

- Manifest: `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/manifest.json`
- Manifest hash: `sha256:caa4036a28a40886a953a1b547059fd1073cabe35e67f73dc56418b02c02676f`
- Image/compositor lineage: `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/df240-image-compositor-export-lineage.json`
- Image/compositor lineage hash: `sha256:ad313eca0ac30db6e6f9fef609899281cf477f6062909b0ecdc27c9eda86b716`

This closes only the image/compositor packaging gap. DF-240 remains open because production Codex text-turn lineage, source ids per final report slide, and final PNG/project export package QA are still missing.

## 2026-06-21 KST lane evidence update

This ticket remains hard-blocked on production text lineage and packaged export
QA. Lane D now supplies image/compositor partial lineage, but no final
PNG/project export bundle or benchmark/export output bundle is present in this
lane's `release-artifacts`; it contains only `DeckForge_0.1.0_aarch64.dmg`, its
checksum, and `README.md`. The DMG checksum matches the committed checksum, but
the mounted `/Volumes/DeckForge/DeckForge.app` fails both `codesign --verify`
and `spctl --assess` with `code has no resources but signature indicates they
must be present`, so packaged report/export review cannot run from this
artifact.
See `docs/live-research-lane-blockers-2026-06-21.md`.
