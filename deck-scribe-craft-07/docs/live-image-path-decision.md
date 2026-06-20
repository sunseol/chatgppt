# Live Image Path Decision

Date: 2026-06-18

Scope: DF-230 production image generation path lock.

Status: Closed on GitHub with live Codex OAuth evidence

## Contract added

`src/lib/image-path-decision.ts` defines the production image path decision record used to prevent an unverified image route from entering production choices.

- A path is `locked` only when setup is ready for Codex OAuth image generation, the decision records a non-placeholder account usage owner and all required provider permissions as non-placeholder values, the selected provider route matches the stored artifact provider, the stored artifact records a nonblank request model matching the selected route model, the artifact contains PNG binary data with a PNG signature, a binary artifact path points to versioned project image storage for the same slide as the successful artifact, a provider provenance sidecar path points to the same stored slide/version, the sidecar records production execution with the selected provider, auth mode, model, prompt version, fixture flag, and canonical Codex turn/thread ids, and Codex image artifacts include nonblank unpadded turn and thread ids.
- Without one real image artifact, the decision is `blocked` with `missing_real_image_artifact`.
- Incomplete setup remains blocked with setup codes such as `requiresCodexImageCapability`; the API-key image route is explicitly excluded from production choices.
- Incomplete decision evidence remains blocked with `missing_billing_owner`, `missing_required_permissions`, `invalid_image_binary`, `missing_binary_artifact`, `invalid_binary_artifact_path`, `binary_artifact_slide_mismatch`, `missing_provenance_artifact`, `invalid_provenance_artifact_path`, `provenance_artifact_path_mismatch`, `missing_provenance_evidence`, `provenance_execution_mode_mismatch`, `provenance_provider_mismatch`, `provenance_auth_mode_mismatch`, `provenance_model_mismatch`, `provenance_prompt_version_mismatch`, `provenance_fixture_contamination`, `provenance_request_id_mismatch`, `artifact_provider_mismatch`, `missing_request_model`, `artifact_model_mismatch`, or `missing_request_id`.
- `fixtureFallbackAllowed: false` is fixed on every decision record.
- `getProductionImageProviderChoices` returns an empty list for blocked decisions.
- `src/lib/production-image-generation-gate.ts` allows the `mock` provider only in development mode.
- Production generation is blocked with `missing_image_path_decision` until `DeckProject.imagePathDecision` contains a locked decision record.
- A blocked decision forwards `image_path_not_locked` plus the underlying decision blockers to the Generate stage.
- The production gate revalidates persisted locked decisions before use: fixture fallback flags block with `fixture_fallback_enabled`, blank Codex image turn/thread ids block with `missing_turn_id` or `missing_thread_id`, padded persisted Codex turn/thread ids block with `provenance_turn_id_mismatch` or `provenance_thread_id_mismatch`, padded persisted binary/provenance artifact paths block instead of being trimmed into readiness, non-versioned binary paths block with `invalid_binary_artifact_path`, non-versioned provenance sidecars block with `invalid_provenance_artifact_path`, and binary/provenance version drift blocks with `provenance_artifact_path_mismatch`.
- `src/components/deck/GenerateStage.tsx` disables the production image generation action when this gate is blocked, so the stage cannot return mock preview output as a fixture fallback.

## Decision inputs recorded

- Provider id and auth mode from `decideImageProviderFeasibility`.
- Target model: `gpt-image-2`.
- Account usage owner, which cannot be placeholder text such as `unknown` or `TBD`.
- Required permissions, where every listed permission must be non-placeholder text; a mixed list such as `images.generate` plus `TBD` still blocks with `missing_required_permissions`.
- Excluded routes.
- Versioned project image binary artifact path plus provider provenance sidecar path whose `slide_###` and version match the successful artifact, Codex turn/thread ids, provider request model, prompt version, production execution mode, selected provider, selected auth mode, and non-fixture status when a real image artifact exists.
- The production project-level `imagePathDecision` used by the Generate stage gate.

## Verification

- `bun test src/lib/image-path-decision.test.ts src/lib/image-path-decision-metadata.test.ts src/lib/image-path-decision-request-model.test.ts src/lib/image-path-decision-slide-path.test.ts src/lib/image-path-decision-provenance.test.ts src/lib/image-path-decision-prompt-provenance.test.ts src/lib/image-path-decision-doc.test.ts` passes: 20 tests.
- `bun test src/lib/image-path-decision.test.ts src/lib/image-path-decision-request-model.test.ts src/lib/image-provider-feasibility.test.ts src/lib/slide-image-provider.test.ts` passes: 18 tests.
- `bun test src/lib/production-image-generation-gate.test.ts src/components/deck/GenerateStage.integration.test.tsx` passes: 8 tests. The SSR GenerateStage test emits the existing TanStack Router context warning but verifies the production image path Lock blocker markup.
- `bun run typecheck` passes.
- `bun run lint` passes with the existing six React Fast Refresh warnings only.

## Live Evidence Update

2026-06-21 KST Lane B captured a real authenticated Codex App Server image-generation turn and stored the resulting PNG through the production image artifact store. This is not fixture, mock, placeholder, or API-key evidence.

- Runtime: `codex-cli 0.141.0 app-server --stdio`
- Auth mode: `codex_session` from `codex login status` (`Logged in using ChatGPT`)
- Provider route: Codex OAuth image generation, protocol item type `imageGeneration`
- Thread id: `019ee685-f072-7a50-bf9b-d3ff849e6744`
- Turn id: `019ee685-f31a-74a1-8e2b-6810ccdb209c`
- Model: `gpt-image-2`
- Latency: `33496ms`
- Usage: `imageCount: 1`
- Binary artifact: `projects/df230_live_codex_image/slides/images/slide_001.v1.png`
- Binary hash: `sha256:ce4be415f1c550fc38017e4f8910fa4bcf57031aa17b3c0bfc3909ed8bf19532`
- Binary bytes: `1161656`
- Metadata sidecar: `projects/df230_live_codex_image/slides/images/slide_001.v1.metadata.json`
- Provenance sidecar: `projects/df230_live_codex_image/slides/images/slide_001.v1.provenance.json`
- Evidence summary: `docs/live-evidence/codex-image/df230-df231-live-artifact-summary.json`
- Local pixel probe: `sips -g pixelWidth -g pixelHeight` returned `1672 x 941`.

The production route remains Codex OAuth only. The OpenAI API-key route is not used for production and remains excluded from the locked route decision.
