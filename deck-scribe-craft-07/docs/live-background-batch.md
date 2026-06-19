# Live Background Batch Contract

Date: 2026-06-18

Ticket: DF-232

Status: Partial, external evidence required

## Contract Summary

DF-232 requires five live background artifacts generated from the five approved Layout IR screenshots under one shared deck context and one shared design system. The local contract now rejects a batch unless it has exactly five live background artifacts, exactly five prompt packages, exactly five stored image artifacts when storage evidence is supplied, all associated with the same `deckContextId` and `designSystemId`, and each image has matching versioned storage evidence from the image artifact store by slide id rather than array order.

The validator also requires each artifact to preserve its slide identity, use the matching layout screenshot as a composition reference, remain 16:9 at the expected 1600 by 900 canvas, include unique provider request metadata, contain PNG-signature binary output, carry a prompt that excludes exact title, body, metric, chart, or source text from the generated image, match stored binary/provenance metadata with a real SHA-256 hash, require stored metadata/provenance request ids to match the live artifact request id, and avoid reusing stored artifact ids, paths, or hashes across slides.

## Local Evidence

- `src/lib/slide-context-bundle.ts` now carries `designSystemId` from the approved design system into each slide context bundle.
- `src/lib/slide-prompt-package.ts` includes `designSystemId` in the prompt package and the generated prompt text.
- `src/lib/slide-generation-queue-types.ts` and `src/lib/slide-generation-queue.ts` keep queue context and worker input aligned on the shared design system.
- `src/lib/live-background-batch.ts` and `src/lib/live-background-batch-storage.ts` validate the five-artifact batch and report contract failures such as `prompt_package_count_mismatch`, `stored_artifact_count_mismatch`, `mock_provider_output`, `missing_stored_background_artifact`, `stored_background_artifact_mismatch`, `deck_context_mismatch`, `design_system_mismatch`, `wrong_aspect_ratio`, `slide_id_mismatch`, `layout_reference_mismatch`, `invalid_image_binary`, `missing_provider_request_metadata`, `duplicate_provider_request_metadata`, `duplicate_stored_background_artifact`, and `missing_text_overlay_rule`.
- `getRetryableBackgroundSlideNumbers` returns only failed `retryable` slide numbers from a partial queue result, allowing isolated retry instead of regenerating successful slides.

## Verification

- `bun test src/lib/live-background-batch.test.ts src/lib/live-background-batch-uniqueness.test.ts src/lib/slide-context-bundle.test.ts src/lib/slide-prompt-package.test.ts src/lib/slide-generation-queue.test.ts`
- `bun run typecheck`
- `bun run lint`

## Remaining Live Work

The current repository does not yet contain the required five live background artifacts from a real provider. DF-232 remains open until a production run stores the five real artifacts, their unique versioned binary paths and hashes, unique request metadata, matching stored metadata/provenance request ids, matching slide ids, shared `deckContextId`, shared `designSystemId`, layout screenshot composition references, and retry evidence for any failed slide.
