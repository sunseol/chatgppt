# Live Full-Slide Regeneration Contract

Date: 2026-06-19

Ticket: DF-235

Status: Partial, external evidence required

## Contract Summary

DF-235 requires selected-slide regeneration to create a full new slide background from the approved original context instead of local inpainting. The local contract now requires the selected original slide to already be approved, preserves the selected slide spec hash, `deckContextId`, and `designSystemId`, requires a non-blank edit instruction plus non-empty, non-blank, non-duplicated, and non-overlapping `must_keep` and `must_change`, stores the regenerated background as a newer versioned production OpenAI image artifact with matching API-key provenance, exact storage paths, matching provenance sidecar identity, and metadata/provenance provider request id evidence that differs from the original request, keeps the already approved slide unchanged until the user approves the candidate, and requires matching before/after comparison evidence before approval can replace the original.

## Local Evidence

- `src/lib/live-slide-regeneration.ts` builds a live regeneration request from the existing revision request while preserving `deckContextId`, `designSystemId`, slide plan id, slide spec hash, `mustKeep`, `mustChange`, the original background artifact id, and the original provider request id.
- `src/lib/live-slide-regeneration-request-validation.ts` rejects unsafe requests with `missing_edit_instruction`, `missing_must_keep_targets`, `missing_must_change_targets`, `blank_revision_target`, `duplicate_revision_target`, `revision_targets_overlap`, `missing_original_background_artifact`, and `missing_original_background_request`; `src/lib/live-slide-regeneration.ts` also rejects requests for non-approved selected originals with `original_slide_not_approved`.
- `src/lib/live-slide-regeneration-slide-spec.ts` rejects candidate output when the candidate slide spec number or hash differs from the request's approved `slideSpecHash`.
- `src/lib/live-slide-regeneration-candidate.ts` owns candidate validation so the regeneration contract can keep the candidate artifact rules focused and reviewable.
- The candidate gate rejects invalid output with issue codes including `slide_spec_mismatch`, `original_slide_mismatch`, `original_slide_version_mismatch`, `deck_context_mismatch`, `design_system_mismatch`, `slide_id_mismatch`, `stale_candidate_version`, `background_artifact_not_new`, `background_artifact_version_mismatch`, `background_artifact_storage_path_mismatch`, `invalid_regeneration_background_hash`, `missing_regeneration_request_id`, `regeneration_request_provenance_mismatch`, `regeneration_request_id_not_new`, `regeneration_background_not_live`, and `mock_background_artifact`.
- `slide_spec_mismatch` blocks candidates produced from a stale or different slide spec even when the slide number, deck context, and design system still match.
- `original_slide_mismatch` and `original_slide_version_mismatch` block candidates built from a different selected slide or from a stale approved-original version.
- `background_artifact_version_mismatch` blocks a candidate when the stored binary id/path/metadata path version does not match the candidate slide version.
- `background_artifact_storage_path_mismatch` blocks a candidate when the stored binary path, metadata path, provenance sidecar path, or provenance artifact id does not exactly match the project, slide, and version implied by the regenerated artifact id.
- `invalid_regeneration_background_hash` blocks a candidate when the regenerated stored binary hash is not a full SHA-256 digest.
- `missing_regeneration_request_id` blocks a candidate when the regenerated stored background lacks provider request id evidence.
- `regeneration_request_provenance_mismatch` blocks a candidate when stored request metadata and provider provenance disagree.
- `regeneration_request_id_not_new` blocks a new regenerated artifact when its provider request id matches the approved original background request id.
- `regeneration_background_not_live` blocks a candidate when the regenerated background provenance is not production `openaiImage` with `api_key` auth and non-fixture output.
- A ready candidate points at the new versioned background artifact id, keeps the original background artifact id plus `mustKeep`/`mustChange` provenance, and remains `ready` until explicitly approved.
- Failed candidates return the preserved approved slide so the previous accepted version remains available for review and export.
- `src/lib/live-slide-regeneration-approval.ts` blocks approval with `missing_regeneration_comparison`, `candidate_not_ready_for_approval`, or `regeneration_comparison_mismatch` unless the candidate is still `ready`, the current slide is the approved original, and before/after comparison evidence matches the original descriptor, regenerated descriptor, slide versions, selected slide, and new background artifact id.
- `approveLiveSlideRegenerationCandidate` preserves the approved original when approval evidence is missing or mismatched, and only replaces the selected slide once matching before/after comparison evidence is present.

## Verification

- `bun test src/lib/live-slide-regeneration-approval.test.ts src/lib/live-slide-regeneration-request-validation.test.ts src/lib/live-slide-regeneration-approved-original.test.ts src/lib/live-slide-regeneration-version.test.ts src/lib/live-slide-regeneration-slide-spec.test.ts src/lib/live-slide-regeneration.test.ts src/lib/slide-revision-generation.test.ts src/lib/slide-revision-model.test.ts src/components/deck/RevisionComparePanel.integration.test.tsx`
- `bun run typecheck`
- `bun run lint`

## Remaining Live Work

The current repository has not yet executed full-slide regeneration against a real provider. DF-235 remains open until a production run captures live before/after approval QA, stores a real regenerated background artifact version, and verifies that a failed regeneration preserves the approved original in the app surface.
