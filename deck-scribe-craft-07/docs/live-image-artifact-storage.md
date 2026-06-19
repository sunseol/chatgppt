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
- Records a real 64-character SHA-256 digest for the stored binary.
- Preserves request metadata when available: `requestId`, model, size, quality, latency, and usage.
- Rejects blank request models, missing/invalid latency, and negative or non-finite usage values before writing image bytes or metadata.
- Measures provider-call latency in the OpenAI image adapter when the provider response omits `latencyMs`, so stored provenance duration does not silently fall back to `0`.
- Produces and stores provider provenance for the stored binary artifact, including prompt version, prompt hash, layout reference, request id, model/runtime, duration, auth mode, and fixture flag.
- Rejects non-PNG image data, fake PNG data URLs without a PNG signature, and OpenAI image artifacts with missing or blank `requestId`.
- `src/lib/live-image-provider-adapter.ts` links provider generation to storage in one production-oriented call.
- The adapter passes the full prompt package and layout reference to the provider, stores successful binary output, returns stored artifact/provenance metadata, and does not write artifacts when the provider returns a classified failure.
- `src/lib/slide-image-provider-contract.ts` rejects `provider_contract` mismatches before storage when the returned artifact provider, slide number, aspect ratio, layout reference, or prompt lineage does not match the requested prompt package.

## Provider/error contract

Existing provider tests plus `src/lib/image-provider-errors.test.ts` cover the DF-231 adapter/error requirements:

- `src/lib/slide-image-provider.test.ts` verifies prompt/layout handoff, failure classification, provider response metadata preservation, and adapter-measured latency when a response omits `latencyMs`.
- `src/lib/live-image-provider-adapter.test.ts` verifies the provider-to-storage path, versioned binary/metadata/provenance writes, request metadata preservation, provenance request id, and no-write behavior for `content_policy` failures.
- `src/lib/image-provider-errors.ts` distinguishes `auth`, `quota`, `rate_limit`, `content_policy`, `provider_contract`, `server`, and `unknown`.
- Retry is allowed only for transient classes: `rate_limit`, `server`, and `unknown`.

## Verification

- `bun test src/lib/image-artifact-store.test.ts` passes: 6 tests.
- `bun test src/lib/image-provider-errors.test.ts` passes: 1 test.
- `bun test src/lib/live-image-provider-adapter.test.ts` passes: 3 tests.
- `bun test src/lib/live-image-provider-adapter.test.ts src/lib/image-artifact-store.test.ts src/lib/image-provider-errors.test.ts src/lib/slide-image-provider.test.ts src/lib/image-path-decision.test.ts` passes: 24 tests.
- `bun run typecheck` passes.
- `bun run lint` passes with the existing six React Fast Refresh warnings only.

## Remaining Live work

DF-231 is not ready to close. The local adapter and artifact-store contract exists, but the acceptance criteria still require a real provider integration run that stores actual response bytes and request metadata from the live selected route.
