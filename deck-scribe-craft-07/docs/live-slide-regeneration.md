# Live Full-Slide Regeneration Contract

Date: 2026-06-18

Ticket: DF-235

Status: Partial, external evidence required

## Contract Summary

DF-235 requires selected-slide regeneration to create a full new slide background from the approved original context instead of local inpainting. The local contract now preserves the selected slide spec, `deckContextId`, and `designSystemId`, records `must_keep` and `must_change`, stores the regenerated background as a newer versioned image artifact with provider request id evidence, and keeps the already approved slide unchanged until the user approves the candidate.

## Local Evidence

- `src/lib/live-slide-regeneration.ts` builds a live regeneration request from the existing revision request while preserving `deckContextId`, `designSystemId`, slide plan id, slide spec hash, `mustKeep`, `mustChange`, and the original background artifact id.
- `src/lib/live-slide-regeneration-candidate.ts` owns candidate validation so the regeneration contract can keep the candidate artifact rules focused and reviewable.
- The candidate gate rejects invalid output with issue codes including `deck_context_mismatch`, `design_system_mismatch`, `slide_id_mismatch`, `stale_candidate_version`, `background_artifact_not_new`, `background_artifact_version_mismatch`, `missing_regeneration_request_id`, and `mock_background_artifact`.
- `background_artifact_version_mismatch` blocks a candidate when the stored binary id/path/metadata path version does not match the candidate slide version.
- `missing_regeneration_request_id` blocks a candidate when the regenerated stored background lacks provider request id evidence.
- A ready candidate points at the new versioned background artifact id, keeps the original background artifact id plus `mustKeep`/`mustChange` provenance, and remains `ready` until explicitly approved.
- Failed candidates return the preserved approved slide so the previous accepted version remains available for review and export.
- `approveLiveSlideRegenerationCandidate` replaces only the selected slide and marks the chosen regenerated slide as approved.

## Verification

- `bun test src/lib/live-slide-regeneration-version.test.ts src/lib/live-slide-regeneration.test.ts src/lib/slide-revision-generation.test.ts src/lib/slide-revision-model.test.ts src/components/deck/RevisionComparePanel.integration.test.tsx`
- `bun run typecheck`
- `bun run lint`

## Remaining Live Work

The current repository has not yet executed full-slide regeneration against a real provider. DF-235 remains open until a production run captures live before/after approval QA, stores a real regenerated background artifact version, and verifies that a failed regeneration preserves the approved original in the app surface.
