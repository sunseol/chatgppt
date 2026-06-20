# Live Background Batch Contract

Date: 2026-06-18

Ticket: DF-232

Status: Partial, external evidence required

## Contract Summary

DF-232 requires five live background artifacts generated from the five approved Layout IR screenshots under one shared deck context and one shared design system. The local contract now rejects a batch unless it has exactly five live background artifacts, exactly five prompt packages, exactly five stored image artifacts when storage evidence is supplied, all associated with the same `deckContextId` and `designSystemId`, and each image has matching prompt package plus versioned storage evidence by slide id rather than array order.

The validator also requires each artifact to preserve its slide identity, use the matching layout screenshot as a composition reference, remain 16:9 at the expected 1600 by 900 canvas, include unique canonical unpadded provider request id and request model metadata, contain PNG-signature binary output, carry prompt text and structured text overlay strategy rules that exclude exact title, body, metric, chart, or source text from the generated image, match stored binary/provenance metadata with a real SHA-256 hash and a versioned project image storage path, require stored metadata/provenance request ids and request model/runtime to match the live artifact request, and avoid reusing stored artifact ids, paths, or hashes across slides.

## Local Evidence

- `src/lib/slide-context-bundle.ts` now carries `designSystemId` from the approved design system into each slide context bundle.
- `src/lib/slide-prompt-package.ts` includes `designSystemId` in the prompt package and the generated prompt text.
- `src/lib/slide-generation-queue-types.ts` and `src/lib/slide-generation-queue.ts` keep queue context and worker input aligned on the shared design system.
- `src/lib/live-background-batch.ts`, `src/lib/live-background-batch-storage.ts`, `src/lib/live-background-batch-text-overlay.ts`, `src/lib/live-background-batch-storage-path.test.ts`, `src/lib/live-background-batch-request-model.test.ts`, and `src/lib/live-background-batch-text-overlay.test.ts` validate the five-artifact batch and report contract failures such as `prompt_package_count_mismatch`, `stored_artifact_count_mismatch`, `mock_provider_output`, `missing_prompt_package`, `missing_stored_background_artifact`, `stored_background_artifact_mismatch`, `deck_context_mismatch`, `design_system_mismatch`, `wrong_aspect_ratio`, `slide_id_mismatch`, `layout_reference_mismatch`, `invalid_image_binary`, `missing_provider_request_metadata`, `duplicate_provider_request_metadata`, `duplicate_stored_background_artifact`, and `missing_text_overlay_rule`; padded request ids or request models are treated as `missing_provider_request_metadata` rather than canonical provider evidence.
- `getRetryableBackgroundSlideNumbers` returns only failed `retryable` slide numbers from a partial queue result, allowing isolated retry instead of regenerating successful slides.

## Verification

- `bun test src/lib/live-background-batch-text-overlay.test.ts src/lib/live-background-batch-request-model.test.ts src/lib/live-background-batch.test.ts src/lib/live-background-batch-storage-path.test.ts src/lib/live-background-batch-uniqueness.test.ts`
- `bun test src/lib/live-background-batch.test.ts src/lib/live-background-batch-uniqueness.test.ts src/lib/slide-context-bundle.test.ts src/lib/slide-prompt-package.test.ts src/lib/slide-generation-queue.test.ts`
- `bun run typecheck`
- `bun run lint`

## Remaining Live Work

The current repository does not yet contain the required five live background artifacts from a real provider. DF-232 remains open until a production run stores the five real artifacts, their unique versioned binary paths and hashes, unique canonical request ids and model metadata, matching stored metadata/provenance request ids and model/runtime values, matching slide ids, shared `deckContextId`, shared `designSystemId`, layout screenshot composition references, and retry evidence for any failed slide.
