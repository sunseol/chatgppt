# Live Image Path Decision

Date: 2026-06-18

Scope: DF-230 production image generation path lock.

Status: partial local contract

## Contract added

`src/lib/image-path-decision.ts` defines the production image path decision record used to prevent an unverified image route from entering production choices.

- A path is `locked` only when setup is ready, OpenAI organization verification is confirmed and still matches the decision evidence when the API-key route is used, the decision records non-placeholder billing owner and provider permissions, the selected provider route matches the stored artifact provider, the stored artifact records a nonblank request model matching the selected route model, the artifact contains PNG binary data with a PNG signature, a binary artifact path points to versioned project image storage for the same slide as the successful artifact, a provider provenance sidecar path points to the same stored slide/version, the sidecar records production execution with the selected provider, auth mode, model, prompt version, fixture flag, and request id, and OpenAI image artifacts include a nonblank request id.
- Without one real image artifact, the decision is `blocked` with `missing_real_image_artifact`.
- Incomplete setup remains blocked with setup codes such as `requiresApiCredential` or `requiresOrganizationVerification`; `unknown` OpenAI organization verification is treated as not ready rather than production-lockable, including when stale feasibility evidence says the route is ready.
- Incomplete decision evidence remains blocked with `missing_billing_owner`, `missing_required_permissions`, `invalid_image_binary`, `missing_binary_artifact`, `invalid_binary_artifact_path`, `binary_artifact_slide_mismatch`, `missing_provenance_artifact`, `invalid_provenance_artifact_path`, `provenance_artifact_path_mismatch`, `missing_provenance_evidence`, `provenance_execution_mode_mismatch`, `provenance_provider_mismatch`, `provenance_auth_mode_mismatch`, `provenance_model_mismatch`, `provenance_prompt_version_mismatch`, `provenance_fixture_contamination`, `provenance_request_id_mismatch`, `artifact_provider_mismatch`, `missing_request_model`, `artifact_model_mismatch`, or `missing_request_id`.
- `fixtureFallbackAllowed: false` is fixed on every decision record.
- `getProductionImageProviderChoices` returns an empty list for blocked decisions.
- `src/lib/production-image-generation-gate.ts` allows the `mock` provider only in development mode.
- Production generation is blocked with `missing_image_path_decision` until `DeckProject.imagePathDecision` contains a locked decision record.
- A blocked decision forwards `image_path_not_locked` plus the underlying decision blockers to the Generate stage.
- The production gate revalidates persisted locked decisions before use: fixture fallback flags block with `fixture_fallback_enabled`, blank OpenAI image request ids block with `missing_request_id`, non-versioned binary paths block with `invalid_binary_artifact_path`, non-versioned provenance sidecars block with `invalid_provenance_artifact_path`, and binary/provenance version drift blocks with `provenance_artifact_path_mismatch`.
- `src/components/deck/GenerateStage.tsx` disables the production image generation action when this gate is blocked, so the stage cannot return mock preview output as a fixture fallback.

## Decision inputs recorded

- Provider id and auth mode from `decideImageProviderFeasibility`.
- Target model: `gpt-image-2`.
- Billing owner, which cannot be placeholder text such as `unknown` or `TBD`.
- Required permissions, which cannot be satisfied by placeholder text such as `unknown` or `TBD`.
- Organization verification status, which must be `verified` for the OpenAI API-key route to become production-lockable.
- Excluded routes.
- Versioned project image binary artifact path plus provider provenance sidecar path whose `slide_###` and version match the successful artifact, provider request id, provider request model, prompt version, production execution mode, selected provider, selected auth mode, and non-fixture status when a real image artifact exists.
- The production project-level `imagePathDecision` used by the Generate stage gate.

## Verification

- `bun test src/lib/image-path-decision.test.ts src/lib/image-path-decision-metadata.test.ts src/lib/image-path-decision-request-model.test.ts src/lib/image-path-decision-slide-path.test.ts src/lib/image-path-decision-provenance.test.ts src/lib/image-path-decision-prompt-provenance.test.ts src/lib/image-path-decision-doc.test.ts` passes: 18 tests.
- `bun test src/lib/image-path-decision.test.ts src/lib/image-path-decision-request-model.test.ts src/lib/image-provider-feasibility.test.ts src/lib/slide-image-provider.test.ts` passes: 18 tests.
- `bun test src/lib/production-image-generation-gate.test.ts src/components/deck/GenerateStage.integration.test.tsx` passes: 7 tests. The SSR GenerateStage test emits the existing TanStack Router context warning but verifies the production image path Lock blocker markup.
- `bun run typecheck` passes.
- `bun run lint` passes with the existing six React Fast Refresh warnings only.

## Remaining Live work

DF-230 is not ready to close. The local decision record and Generate-stage gate now prevent fixture fallback and unverified production choices, but the acceptance criteria still require one successful real image request plus stored binary and provenance sidecar artifacts from the selected route.
