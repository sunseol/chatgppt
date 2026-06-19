# Live Golden Path E2E Evidence

Date: 2026-06-18

Ticket: DF-241

## Contract

The Production Mode Live Golden Path E2E evidence bundle must prove that a new project completed the full production path with authenticated live providers:

1. login
2. live interview
3. live research
4. live Deck Plan
5. live Design System
6. live Layout IR
7. live image generation for at least five slides
8. one live full-slide regeneration
9. title edit
10. export

The `completedSteps` evidence must match this canonical sequence exactly; a bundle cannot satisfy DF-241 by listing all steps out of order.

`src/lib/live-golden-path-e2e.ts` validates the evidence bundle before DF-241 can be treated as Verified Live.

## Required Evidence

- Signed non-synthetic, non-local `live_e2e_report.md`
- Step-level screenshots and a recording at non-synthetic, non-local evidence paths
- Final validation bundle at a non-synthetic, non-local `.zip` or `.json` path whose manifest references the final export artifact id, signed report digest, every step screenshot, the recording, valid source artifact ids, and nonblank live image artifact ids without duplicate references
- Zero mock or fixture artifacts in Golden Path lineage
- At least three distinct real source URLs with distinct source artifact ids
- At least one primary or official source URL
- At least five distinct production `openaiImage` artifacts with nonblank artifact ids, `api_key` auth, and distinct provider request ids
- Restart/reopen evidence proving the same project reloads with the same final export artifact
- Redacted report summary with no raw secret-like text

## Blocking Rules

The local gate returns these issue codes:

- `missing_e2e_step`: one or more Golden Path steps are absent.
- `e2e_step_order_mismatch`: all steps are present but do not follow the required production sequence.
- `unsigned_live_e2e_report`: the signed `live_e2e_report.md` evidence is absent, incomplete, synthetic, or developer-local.
- `report_digest_mismatch`: signed report digest does not match the report content.
- `insufficient_step_evidence`: screenshots or recording evidence is incomplete, synthetic, or developer-local.
- `missing_step_screenshot`: at least one Golden Path step lacks its own screenshot.
- `missing_validation_bundle`: final validation bundle manifest is absent or points at a synthetic mock/fixture/test/fake or developer-local path.
- `validation_bundle_export_mismatch`: final validation bundle does not reference the final export artifact id.
- `validation_bundle_report_digest_mismatch`: final validation bundle does not include the signed report digest.
- `validation_bundle_missing_screenshot`: final validation bundle does not include every step screenshot.
- `validation_bundle_missing_recording`: final validation bundle does not include the Golden Path recording.
- `validation_bundle_missing_source`: final validation bundle does not include every valid source artifact id.
- `validation_bundle_missing_image_artifact`: final validation bundle does not include every nonblank live image artifact id.
- `validation_bundle_duplicate_reference`: final validation bundle repeats screenshot, source artifact, or image artifact references.
- `mock_lineage_contamination`: Golden Path lineage includes mock artifacts.
- `fixture_lineage_contamination`: Golden Path lineage includes fixture artifacts.
- `duplicate_live_source`: repeated source URLs or artifact ids cannot satisfy the three-source requirement.
- `insufficient_live_sources`: fewer than three distinct valid source URLs are present.
- `missing_primary_source`: no primary or official source URL is present.
- `duplicate_live_image_artifact`: repeated live image artifact ids cannot satisfy the five-image requirement.
- `duplicate_live_image_request`: repeated provider request ids cannot satisfy the five-image requirement.
- `insufficient_live_image_artifacts`: fewer than five distinct production image artifacts with nonblank ids, API key auth, and request ids are present.
- `missing_restart_reopen_evidence`: app restart/reopen evidence does not match the final project/export artifact.
- `secret_leak`: report content contains secret-like text.

## Local Evidence

- `src/lib/live-golden-path-e2e.test.ts`, `src/lib/live-golden-path-step-order.test.ts`, `src/lib/live-golden-path-local-path-evidence.test.ts`, `src/lib/live-golden-path-validation-bundle-path.test.ts`, `src/lib/live-golden-path-image-request-uniqueness.test.ts`, and `src/lib/live-golden-path-image-auth-evidence.test.ts` verify a passing signed bundle, redacted summary formatting, digest matching, canonical step order, per-step screenshot requirements, final validation bundle manifest consistency, synthetic and developer-local evidence path rejection, unauthenticated image rejection, duplicate validation bundle reference rejection, blank image artifact id rejection, duplicate source/image artifact/request rejection, and incomplete/contaminated bundle blockers.
- `src/lib/live-release-gate.ts` still requires DF-241 to be `verified_live` before the Live Initial Version can release.
- `docs/live-release-decision.md` remains blocked because no real authenticated Golden Path bundle has been produced.

## Remaining Live Evidence

This local contract does not execute the providers. DF-241 still needs a real production run and stored `live_e2e_report.md`, screenshots/recording, and final validation bundle before the GitHub issue can close.
