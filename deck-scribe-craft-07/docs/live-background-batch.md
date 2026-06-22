# Live Background Batch Contract

Date: 2026-06-18

Ticket: DF-232

Status: Closed on GitHub with live Codex OAuth evidence

## Contract Summary

DF-232 requires five live background artifacts generated from the five approved Layout IR screenshots under one shared deck context and one shared design system. The local contract now rejects a batch unless it has exactly five live background artifacts, exactly five prompt packages, exactly five stored image artifacts when storage evidence is supplied, all associated with the same `deckContextId` and `designSystemId`, and each image has matching prompt package plus versioned storage evidence by slide id rather than array order.

The validator also requires each artifact to preserve its slide identity, use the matching layout screenshot as a composition reference, remain 16:9 at the expected 1600 by 900 canvas, include canonical provider request metadata, contain PNG-signature binary output, carry prompt text and structured text overlay strategy rules that exclude exact title, body, metric, chart, or source text from the generated image, match stored binary/provenance metadata with a real SHA-256 hash and versioned project image storage paths, require metadata/provenance sidecar paths to match the same binary slide/version, require stored metadata/provenance request ids or Codex thread/turn ids and request model/runtime to match the live artifact request, require provider provenance sidecar identity fields to match the stored binary and live artifact prompt/layout inputs, reject empty provider usage sidecars when usage metadata is supplied, and avoid reusing stored artifact ids, paths, hashes, OpenAI request ids, or Codex turn ids across slides. OpenAI-style provider evidence still needs a canonical unpadded provider request id; Codex OAuth evidence needs canonical unpadded thread and turn ids.

## Local Evidence

- `src/lib/slide-context-bundle.ts` now carries `designSystemId` from the approved design system into each slide context bundle.
- `src/lib/slide-prompt-package.ts` includes `designSystemId` in the prompt package and the generated prompt text.
- `src/lib/slide-generation-queue-types.ts` and `src/lib/slide-generation-queue.ts` keep queue context and worker input aligned on the shared design system.
- `src/lib/live-background-batch.ts`, `src/lib/live-background-batch-storage.ts`, `src/lib/live-background-batch-text-overlay.ts`, `src/lib/live-background-batch-storage-path.test.ts`, `src/lib/live-background-batch-request-model.test.ts`, `src/lib/live-background-batch-provenance.test.ts`, and `src/lib/live-background-batch-text-overlay.test.ts` validate the five-artifact batch and report contract failures such as `prompt_package_count_mismatch`, `stored_artifact_count_mismatch`, `mock_provider_output`, `missing_prompt_package`, `missing_stored_background_artifact`, `stored_background_artifact_mismatch`, `deck_context_mismatch`, `design_system_mismatch`, `wrong_aspect_ratio`, `slide_id_mismatch`, `layout_reference_mismatch`, `invalid_image_binary`, `missing_provider_request_metadata`, `duplicate_provider_request_metadata`, `duplicate_stored_background_artifact`, and `missing_text_overlay_rule`; padded request ids or request models are treated as `missing_provider_request_metadata` rather than canonical provider evidence, empty usage sidecars are treated as stored artifact mismatch, stored binary/metadata/provenance paths must share the same versioned slide identity, and provider provenance sidecar artifact id, production execution mode, provider/auth mode, prompt version, input artifact ids, and duration must match the stored binary and live artifact.
- Codex OAuth image batches are accepted with canonical `threadId` and `turnId` instead of OpenAI-style `requestId`; stored metadata and provenance must preserve the same Codex turn identity, and a batch cannot reuse one Codex turn as evidence for multiple slide backgrounds.
- `getRetryableBackgroundSlideNumbers` returns only failed `retryable` slide numbers from a partial queue result, allowing isolated retry instead of regenerating successful slides.

## Verification

- `bun test src/lib/live-background-batch-text-overlay.test.ts src/lib/live-background-batch-request-model.test.ts src/lib/live-background-batch-provenance.test.ts src/lib/live-background-batch.test.ts src/lib/live-background-batch-storage-path.test.ts src/lib/live-background-batch-uniqueness.test.ts`
- `bun test src/lib/live-background-batch.test.ts src/lib/live-background-batch-uniqueness.test.ts src/lib/slide-context-bundle.test.ts src/lib/slide-prompt-package.test.ts src/lib/slide-generation-queue.test.ts`
- `bun run typecheck`
- `bun run lint`

## Live Evidence Update

2026-06-21 KST Lane B generated five distinct live Codex OAuth background artifacts under one thread and validated the batch with `validateLiveBackgroundBatch`, which returned `{ "kind": "ready" }`.

- Runtime: `codex-cli 0.141.0 app-server --stdio`
- Thread id: `019ee689-3814-73e3-bf80-3ff0fc6e1d44`
- Batch id: `df232_live_codex_batch_2026_06_21`
- Deck context id: `deck_context_df232_live_codex_batch`
- Design system id: `design_df232_live_codex_batch`
- Evidence summary: `docs/live-evidence/codex-image/df232-five-background-protocol-summary.json`
- Protocol methods: `docs/live-evidence/codex-image/df232-five-background-protocol-methods.txt`

| Slide | Turn id | Latency | Binary | SHA-256 |
| --- | --- | ---: | --- | --- |
| 1 | `019ee689-3af0-7891-83f5-2f386f43c181` | `56466ms` | `projects/df232_live_codex_batch/slides/images/slide_001.v1.png` | `sha256:6f68ea1203e933f5eeb4ccde8c6ac50743359939db79ccedf25c9e56e0adb441` |
| 2 | `019ee68a-214d-7be2-8984-b3461b1cf8db` | `49422ms` | `projects/df232_live_codex_batch/slides/images/slide_002.v1.png` | `sha256:79e270f943bce87cff5873f6a39604b2dbbb5fdc70f79d46f597b685f44a9c67` |
| 3 | `019ee68a-e53e-71c0-814a-8d5da527c75a` | `30413ms` | `projects/df232_live_codex_batch/slides/images/slide_003.v1.png` | `sha256:d5a129265c0bfb05e85641606a7d1972842eb80ac0d3f230a9c8694fe96c15a8` |
| 4 | `019ee68b-5d5c-7a62-bf39-ae1c19bf4c41` | `28803ms` | `projects/df232_live_codex_batch/slides/images/slide_004.v1.png` | `sha256:98d28796887b9791065a041b205505327ac965946836a2bdb908a76c0550fb09` |
| 5 | `019ee68b-cf93-7dd3-9a6a-2a25cb63205a` | `32849ms` | `projects/df232_live_codex_batch/slides/images/slide_005.v1.png` | `sha256:6a0d38f03c2c805b6962cec0fff8b8b9fe720cf76d8288` |

Each slide also has matching `.metadata.json` and `.provenance.json` sidecars next to the PNG. Local `sips` inspection returned `1672 x 941` for each provider PNG; the app metadata preserves the requested 16:9 canvas contract (`1600 x 900`) for compositor layout.
