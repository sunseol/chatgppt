# Live Full-Slide Regeneration Contract

Date: 2026-06-19

Ticket: DF-235

Status: Partial, external evidence required

## Contract Summary

DF-235 requires selected-slide regeneration to create a full new slide background from the approved original context instead of local inpainting. The local contract now requires the selected original slide to already be approved, preserves the selected slide spec hash, `deckContextId`, and `designSystemId`, requires a non-blank edit instruction plus non-empty, non-blank, non-duplicated, and non-overlapping `must_keep` and `must_change`, requires canonical original background artifact and Codex turn evidence before provider submission, stores the regenerated background as a newer versioned production Codex image artifact with matching Codex OAuth provenance, exact storage paths, matching provenance sidecar identity, and metadata/provenance provider turn evidence that differs from the original turn, keeps the already approved slide unchanged until the user approves the candidate, and requires matching before/after comparison evidence including requested/preserved target lists before approval can replace the original.

## Local Evidence

- `src/lib/live-slide-regeneration.ts` builds a live regeneration request from the existing revision request while preserving `deckContextId`, `designSystemId`, slide plan id, slide spec hash, `mustKeep`, `mustChange`, the original background artifact id, and the original provider turn id.
- `src/lib/live-slide-regeneration-request-validation.ts` rejects unsafe requests with `missing_edit_instruction`, `missing_must_keep_targets`, `missing_must_change_targets`, `blank_revision_target`, `duplicate_revision_target`, `revision_targets_overlap`, `missing_original_background_artifact`, `missing_original_background_request`, and `original_background_evidence_not_canonical`; `src/lib/live-slide-regeneration.ts` also rejects requests for non-approved selected originals with `original_slide_not_approved`.
- `src/lib/live-slide-regeneration-slide-spec.ts` rejects candidate output when the candidate slide spec number or hash differs from the request's approved `slideSpecHash`.
- `src/lib/live-slide-regeneration-candidate.ts` owns candidate validation so the regeneration contract can keep the candidate artifact rules focused and reviewable.
- The candidate gate rejects invalid output with issue codes including `slide_spec_mismatch`, `original_slide_mismatch`, `original_slide_version_mismatch`, `deck_context_mismatch`, `design_system_mismatch`, `slide_id_mismatch`, `stale_candidate_version`, `background_artifact_not_new`, `background_artifact_version_mismatch`, `background_artifact_storage_path_mismatch`, `invalid_regeneration_background_hash`, `missing_regeneration_request_id`, `regeneration_request_provenance_mismatch`, `regeneration_request_id_not_new`, `regeneration_background_not_live`, and `mock_background_artifact`.
- `slide_spec_mismatch` blocks candidates produced from a stale or different slide spec even when the slide number, deck context, and design system still match.
- `original_slide_mismatch` and `original_slide_version_mismatch` block candidates built from a different selected slide or from a stale approved-original version.
- `background_artifact_version_mismatch` blocks a candidate when the stored binary id/path/metadata path version does not match the candidate slide version.
- `background_artifact_storage_path_mismatch` blocks a candidate when the stored binary path, metadata path, provenance sidecar path, or provenance artifact id does not exactly match the project, slide, and version implied by the regenerated artifact id.
- `invalid_regeneration_background_hash` blocks a candidate when the regenerated stored binary hash is not a full SHA-256 digest.
- `missing_regeneration_request_id` blocks a candidate when the regenerated stored background lacks provider turn/request evidence.
- `regeneration_request_provenance_mismatch` blocks a candidate when stored request metadata and provider provenance disagree.
- `regeneration_request_id_not_new` blocks a new regenerated artifact when its provider turn id matches the approved original background turn id.
- `regeneration_background_not_live` blocks a candidate when the regenerated background provenance is not production `codex` with `codex_session` auth and non-fixture output.
- A ready candidate points at the new versioned background artifact id, keeps the original background artifact id plus `mustKeep`/`mustChange` provenance, and remains `ready` until explicitly approved.
- Failed candidates return the preserved approved slide so the previous accepted version remains available for review and export.
- `src/lib/live-slide-regeneration-approval.ts` blocks approval with `missing_regeneration_comparison`, `candidate_not_ready_for_approval`, or `regeneration_comparison_mismatch` unless the candidate is still `ready`, the current slide is the approved original, and before/after comparison evidence matches the original descriptor, regenerated descriptor, slide versions, selected slide, new background artifact id, `requestedChanges`, and `preservedTargets`.
- `approveLiveSlideRegenerationCandidate` preserves the approved original when approval evidence is missing or mismatched, and only replaces the selected slide once matching before/after comparison evidence is present.
- `src/lib/live-slide-regeneration-review-evidence.ts` writes portable DF-235 review evidence at `projects/{projectId}/live-evidence/df235-slide-regeneration-review-{eventId}.json` for both approved candidates and failed live regeneration attempts that preserve the original.
- `src/components/deck/review-stage-regeneration-evidence.ts` connects the Review-stage approval button to that writer, and `src/components/deck/review-stage-regeneration.ts` records failure-preservation evidence instead of silently falling back to local mock regeneration when an eligible live Codex regeneration fails or is blocked.

## Verification

- `bun test src/lib/live-slide-regeneration-approval.test.ts src/lib/live-slide-regeneration-request-validation.test.ts src/lib/live-slide-regeneration-approved-original.test.ts src/lib/live-slide-regeneration-version.test.ts src/lib/live-slide-regeneration-slide-spec.test.ts src/lib/live-slide-regeneration.test.ts src/lib/slide-revision-generation.test.ts src/lib/slide-revision-model.test.ts src/components/deck/RevisionComparePanel.integration.test.tsx`
- `bun test src/components/deck/review-stage-regeneration.test.ts`
- `bun run typecheck`
- `bun run lint`

## Live Evidence Update

2026-06-21 KST Lane B submitted selected slide 3 to the authenticated Codex OAuth image route for a full-slide regeneration. The first structured attempt timed out and produced no artifact. The retry used a simpler generation turn and stored a real regenerated version 2 background.

- Runtime: `codex-cli 0.141.0 app-server --stdio`
- Regeneration thread id: `019ee690-9595-7323-86d7-e188639cd355`
- Regeneration turn id: `019ee690-9801-71b0-9062-cc72a74d2f97`
- Selected slide: `3`
- Approved original: `projects/df232_live_codex_batch/slides/images/slide_003.v1.png`
- Approved original hash: `sha256:d5a129265c0bfb05e85641606a7d1972842eb80ac0d3f230a9c8694fe96c15a8`
- Regenerated binary: `projects/df235_live_regeneration/slides/images/slide_003.v2.png`
- Regenerated hash: `sha256:fec63060405bbe50246c9216447c8759fc5426eed8f14d5c1dfb7b8df5d0d202`
- Metadata sidecar: `projects/df235_live_regeneration/slides/images/slide_003.v2.metadata.json`
- Provenance sidecar: `projects/df235_live_regeneration/slides/images/slide_003.v2.provenance.json`
- Latency: `63784ms`
- Evidence summary: `docs/live-evidence/codex-image/df235-selected-slide-regeneration-summary.json`

DF-235 still needs packaged app before/after approval QA before closure: the live regenerated background exists, but the review-gallery approval surface was not manually driven to approve the v2 candidate or verify failed-regeneration preservation in the UI.

## Lane D App-Surface Recheck

2026-06-21 KST Lane D packaged the approved v1 slide 3 and regenerated v2 slide 3 into before/after review evidence:

- Before/after review: `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/df235-before-after-review.html`
- Before/after hash: `sha256:8c170b78a077345816d39ec244711569082bb91152d09fa0b412a59403862a1b`
- Preservation record: `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/df235-preservation-record.json`
- Preservation hash: `sha256:f3b3d5c3cf28f4ef7e49d31545f67e28ec7e724edcd1e0d51e65107360eb57f2`

This evidence ties the v2 candidate to regeneration thread `019ee690-9595-7323-86d7-e188639cd355`, turn `019ee690-9801-71b0-9062-cc72a74d2f97`, and regenerated hash `sha256:fec63060405bbe50246c9216447c8759fc5426eed8f14d5c1dfb7b8df5d0d202`. DF-235 remains open because the packaged review UI still has not been manually driven through candidate approval and failed-regeneration preservation.

## Lane G Closure Recheck

2026-06-21 KST Lane G rechecked #149 and preserved the blocker in
`docs/live-evidence/codex-image/lane-g-closure-recheck-20260621/issue-closure-evidence.json`.
The real regenerated v2 image, before/after HTML, and preservation JSON are
present and hashed, but there is still no packaged review UI run proving the v2
candidate was approved from the app surface or that a failed live regeneration
kept the approved original selected/exportable.

## Review Evidence Product Hook

2026-06-21 KST product update: the Review stage now persists DF-235 app-surface
evidence when a live regenerated candidate is approved. The evidence bundle
records outcome `approved`, the live candidate, before/after comparison, and the
approved slide at
`projects/{projectId}/live-evidence/df235-slide-regeneration-review-{requestId}.json`.

The live Codex Review-stage path also stops falling back to local mock
regeneration when a candidate-producing live path fails. Instead it preserves
the approved original, leaves no comparison candidate to approve, and writes
outcome `preserved_after_failure` evidence with the provider or validation
issues. This closes the local product gap that prevented a packaged manual QA
run from handing reviewers a single approval/failure-preservation artifact.

DF-235 remains open until this artifact is produced by a real packaged app
review run and attached to the Lane D evidence bundle.
