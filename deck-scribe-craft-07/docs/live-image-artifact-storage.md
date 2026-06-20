# Live Image Artifact Storage

Date: 2026-06-18

Scope: DF-231 Live Image Provider Adapter and Binary Artifact Storage.

Status: partial local contract

## Contract added

`src/lib/image-artifact-store.ts` connects a provider-produced `SlideImageArtifact` to versioned image artifact storage.

- Decodes provider PNG data URLs into bytes only when the payload has a valid PNG signature.
- Stores a versioned PNG binary at `projects/<projectId>/slides/images/slide_<n>.v<version>.png`.
- Stores metadata at `projects/<projectId>/slides/images/slide_<n>.v<version>.metadata.json`.
- Stores provider provenance at `projects/<projectId>/slides/images/slide_<n>.v<version>.provenance.json`.
- Requires `projectId` to be a safe storage segment before writing the binary or metadata files, so path traversal values cannot create false project-local artifacts.
- Requires slide number and artifact version to be positive integers before writing, so `slide_000`, fractional, or non-positive versioned-looking paths cannot count as stored provider output.
- Rejects mock image artifacts before writing, so development preview output cannot be persisted as Live provider bytes.
- Records a real 64-character SHA-256 digest for the stored binary.
- Rejects blank or whitespace-padded prompt id/version/hash and layout screenshot references before writing, so stored provenance `promptVersion` and `inputArtifactIds` cannot be built from missing or trim-only prompt/layout lineage.
- Preserves Codex turn metadata when available: turn id, thread id, model, size, quality, latency, and usage.
- Rejects whitespace-padded provider turn ids, request models, size values, or quality values before writing, so stored metadata and provenance keep canonical provider turn metadata rather than trim-only evidence.
- Rejects blank request models, missing/invalid latency, empty usage metadata without usage evidence, fractional or negative usage counts, and negative or non-finite usage/cost values before writing image bytes or metadata.
- Records provider-call latency from the Codex image provider response, so stored provenance duration does not silently fall back to `0`.
- Produces and stores provider provenance for the stored binary artifact, including prompt version, prompt hash, layout reference, turn id, model/runtime, duration, auth mode, and fixture flag.
- Rejects non-PNG image data, fake PNG data URLs without a PNG signature, and Codex image artifacts with missing or blank turn/thread ids.
- `src/lib/live-image-provider-adapter.ts` links provider generation to storage in one production-oriented call.
- The adapter rejects mock providers before generation, passes the full prompt package and layout reference to live providers, stores successful binary output, returns stored artifact/provenance metadata, and does not write artifacts when the provider returns a classified failure or when storage rejects invalid provider bytes/request metadata.
- `src/lib/slide-image-provider-contract.ts` rejects `provider_contract` mismatches before storage when the returned artifact provider, slide number, aspect ratio, layout reference, or prompt lineage does not match the requested prompt package.

## Provider/error contract

Existing provider tests plus `src/lib/image-provider-errors.test.ts` cover the DF-231 adapter/error requirements:

- `src/lib/slide-image-provider.test.ts` verifies prompt/layout handoff, failure classification, provider response metadata preservation, and adapter-measured latency when a response omits `latencyMs`.
- `src/lib/live-image-provider-adapter.test.ts` verifies the provider-to-storage path, versioned binary/metadata/provenance writes, request metadata preservation, provenance turn id, no-write behavior for `content_policy` failures, and no-write `provider_contract` results for storage validation failures.
- `src/lib/image-provider-errors.ts` distinguishes `auth`, `quota`, `rate_limit`, `content_policy`, `provider_contract`, `server`, and `unknown`.
- Retry is allowed only for transient classes: `rate_limit`, `server`, and `unknown`.

## Verification

- `bun test src/lib/image-artifact-store.test.ts src/lib/image-artifact-store-usage.test.ts src/lib/image-artifact-store-live-provider.test.ts src/lib/image-artifact-store-lineage.test.ts src/lib/image-artifact-store-request-metadata.test.ts src/lib/image-artifact-storage-doc.test.ts` passes: 13 tests.
- `bun test src/lib/image-provider-errors.test.ts` passes: 1 test.
- `bun test src/lib/live-image-provider-adapter.test.ts src/lib/live-image-provider-adapter-live-provider.test.ts` passes: 5 tests.
- `bun test src/lib/live-image-provider-adapter.test.ts src/lib/image-artifact-store.test.ts src/lib/image-provider-errors.test.ts src/lib/slide-image-provider.test.ts src/lib/image-path-decision.test.ts` passes: 24 tests.
- `bun run typecheck` passes.
- `bun run lint` passes with the existing six React Fast Refresh warnings only.

## Live Evidence Update

2026-06-21 KST Lane B verified the adapter/storage path with a real authenticated Codex image result. The installed App Server emits the current image protocol as `item/completed` with `item.type: "imageGeneration"`, so `src/lib/codex-image-result-mapper.ts` now accepts that shape in addition to the older raw `image_generation_call` response item.

- Runtime: `codex-cli 0.141.0 app-server --stdio`
- Thread id: `019ee685-f072-7a50-bf9b-d3ff849e6744`
- Turn id: `019ee685-f31a-74a1-8e2b-6810ccdb209c`
- Image item id: `ig_0ce583e16a7b4660016a36eb08a87081919576330c50719ef1`
- Revised prompt: `Create a tiny 16:9 PNG slide background: clean abstract presentation backdrop, subtle blue-to-teal gradient, soft geometric light shapes, minimal visual noise, no text, no logos, widescreen composition.`
- Stored binary: `projects/df230_live_codex_image/slides/images/slide_001.v1.png`
- SHA-256: `sha256:ce4be415f1c550fc38017e4f8910fa4bcf57031aa17b3c0bfc3909ed8bf19532`
- Metadata: `projects/df230_live_codex_image/slides/images/slide_001.v1.metadata.json`
- Provenance: `projects/df230_live_codex_image/slides/images/slide_001.v1.provenance.json`
- Evidence: `docs/live-evidence/codex-image/df230-df231-live-artifact-summary.json`

The sidecars carry provider `codex`, auth `codex_session`, model `gpt-image-2`, `fixture: false`, prompt version `slide_generation@codex-live-probe-v1`, layout input id `live-layout-reference/df230-slide-001-composition.png`, the Codex thread id, and the Codex turn id.
