# Live Image Queue Controls

Date: 2026-06-19

Ticket: DF-233

Status: Partial, external evidence required

## Contract Summary

DF-233 requires the live image queue to throttle concurrent work, retry only transient provider failures, support user cancellation, and resume without regenerating completed slides. The local queue now keeps those controls in the slide generation boundary so production runs cannot silently rerun successful images or treat cancellation as a normal success.

## Local Evidence

- `src/lib/slide-generation-queue.ts` still bounds concurrency with `maxParallel`, normalizes non-finite parallel limits back to the default finite throttle, records requested/effective/observed concurrency evidence, and accepts `completedSlides` so partial resume skips only already generated `ready` or `approved` slide numbers whose descriptors exactly match the current live image descriptor: provider, 16:9 aspect, layout reference, and `slide_generation@v1` prompt lineage. It regenerates stale prompt-lineage, stale layout-reference, unfinished `pending`, or `generating` entries.
- `src/lib/slide-generation-retry-policy.ts` classifies retry decisions through image provider failure kinds and applies exponential backoff for transient `rate_limit`, `server`, and unknown failures only when a retry policy allows more attempts.
- `src/lib/slide-generation-queue-executor.ts` records retry provenance on failed slides and successful-after-retry slides: job id, bundle id, slide number, attempt, failure kind, message, and retry delay history. It also rechecks cancellation after retry backoff before calling `manager.retry`, so a user cancellation during backoff cannot start or count a new provider attempt. Provider output is checked again after an in-flight image call returns, so an image that completes after user cancellation is recorded as cancelled rather than accepted.
- `SlideGenerationQueueResult.retryProvenance` preserves retry events even when a slide eventually succeeds, so live QA can audit transient `rate_limit` or `server` recovery instead of seeing only the final success.
- `src/lib/live-image-queue-evidence-export.ts` now writes a DF-233 queue evidence JSON bundle after production Codex Generate-stage runs. The bundle records queue status, context, slides, failures, provider job snapshots, prompt usage, retry provenance, concurrency, progress, stored image artifact paths, and the queue evidence `validation` result at `projects/{projectId}/live-evidence/df233-image-queue-{jobId}.json`, so a packaged run can hand auditors one queue artifact without requiring raw localStorage inspection or letting blocked evidence look closure-ready. Export validation now also requires every completed slide to have a matching `projects/{projectId}/slides/images/slide_{number}.v{version}.png` artifact path, rejects invalid, duplicated, scratch, or template-like stored image paths, and rejects extra stored paths that do not match completed queue slides.
- `src/lib/live-image-queue-evidence.ts`, `src/lib/live-image-queue-progress.ts`, `src/lib/live-image-queue-concurrency.ts`, `src/lib/live-image-queue-cancellation.ts`, `src/lib/live-image-queue-retry-slide.ts`, `src/lib/live-image-queue-retry-delay.ts`, and `src/lib/live-image-queue-restart-resume-evidence.ts` reject progress counts that do not match the recorded slides/failures with `queue_progress_count_mismatch`, queue status values that contradict final slide/failure counts with `queue_status_count_mismatch`, missing concurrency proof with `missing_concurrency_evidence`, zero or invalid requested/effective concurrency limits with `invalid_concurrency_evidence`, observed concurrency above the effective throttle with `concurrency_limit_exceeded`, blank or boundary-whitespace-padded context/job/bundle identities with `noncanonical_queue_evidence_identity`, provider failure evidence that is not anchored to a failed recorded provider job and matching slide-generation prompt usage with `failure_job_not_found` or `failure_prompt_usage_missing`, retry evidence that is not anchored to a recorded provider job and slide-generation prompt usage, retry event counts or attempt sequences that do not match the final job attempt, retry events tied to a different bundle or slide than the retried job output/failure, negative, fractional, or non-finite retry delays with `retry_delay_invalid`, retry delay histories that differ from failed slide evidence with `retry_delay_history_mismatch`, non-transient retry failure kinds, cancelled provider jobs without matching slide failure evidence with `cancelled_job_missing_failure`, cancellation failures without a cancelled provider job, matching attempt count, preserved cancel signal, or matching slide-generation prompt bundle, and restart-resume evidence whose `resumedArtifactIds` reuse an artifact that was already listed in `completedArtifactIdsBefore`.
- `isCancellationRequested` prevents later provider calls after a user cancellation and records cancelled jobs plus slide failures instead of leaving background work running.
- `src/lib/provider-job-recovery.ts` rejects packaged resume snapshots when any job entry is malformed or when `currentJobId` is absent from the parsed jobs, so restart-resume evidence cannot silently drop the broken cancel/retry job and still look recoverable.
- `src/lib/slide-generation-queue-live-controls.test.ts` covers bounded `rate_limit` retry, max-attempt `server` retry provenance, later-call cancellation, in-flight cancellation before provider completion, completed-slide partial resume, and unfinished-slide regeneration during partial resume. `src/lib/slide-generation-queue-resume-lineage.test.ts` covers stale prompt-lineage and stale layout-reference regeneration during partial resume. `src/lib/slide-generation-queue-cancellation-backoff.test.ts` covers cancellation during retry backoff without starting the next attempt. `src/lib/live-image-queue-progress.test.ts` covers progress and status false-ready evidence whose reported counts contradict recorded queue outputs. `src/lib/live-image-queue-concurrency.test.ts` covers missing, zero-limit, and over-limit concurrency evidence and proves queue execution records the observed throttle. `src/lib/live-image-queue-evidence-identity.test.ts` covers padded job/bundle identities that otherwise match each other. `src/lib/live-image-queue-cancelled-job.test.ts` covers cancelled provider jobs that are missing slide failure evidence. `src/lib/live-image-queue-retry-delay.test.ts` covers false-ready retry evidence whose provenance delay does not match the failed slide retry delay history. `src/lib/live-image-queue-retry-delay-invalid.test.ts` covers impossible retry delay evidence such as negative delay values. `src/lib/live-image-queue-evidence.test.ts` covers non-cancelled provider failure evidence that omits the failed provider job and prompt usage linkage. `src/lib/live-image-queue-evidence-export.test.ts` covers exported queue evidence that otherwise looks ready but omits the stored image artifact path for a completed slide, uses a non-positive image version, or cites a temporary project image path. `src/lib/live-image-queue-evidence-export-resume.test.ts` covers restart-resume evidence that reuses a completed-before artifact as a resumed artifact.

## Verification

- `bun test src/lib/slide-generation-queue-resume-lineage.test.ts src/lib/slide-generation-queue-cancellation-backoff.test.ts src/lib/slide-generation-queue-live-controls.test.ts src/lib/slide-generation-queue.test.ts src/lib/live-background-batch.test.ts`
- `bun test src/lib/live-image-queue-evidence-export.test.ts src/components/deck/generate-stage-codex-runner.test.ts`
- `bun test src/lib/live-image-queue-cancelled-job.test.ts src/lib/live-image-queue-retry-delay.test.ts src/lib/live-image-queue-retry-slide.test.ts src/lib/live-image-queue-cancel-attempt.test.ts src/lib/live-image-queue-evidence.test.ts`
- `bun run typecheck`
- `bun run lint`

## Live Evidence Update

2026-06-21 KST Lane B executed live Codex OAuth image generation for five backgrounds. The five successful turns provide real latency and stored-completion evidence for resume inputs, but they did not encounter live 429/5xx responses and did not include a user cancellation from the packaged app surface.

- Five-background live evidence: `docs/live-evidence/codex-image/df232-five-background-protocol-summary.json`
- Stored artifacts: `projects/df232_live_codex_batch/slides/images/slide_001.v1.png` through `slide_005.v1.png`
- Observed latencies: `56466ms`, `49422ms`, `30413ms`, `28803ms`, `32849ms`
- Each stored slide has metadata/provenance sidecars with Codex thread `019ee689-3814-73e3-bf80-3ff0fc6e1d44` and unique turn ids.

DF-233 remains open for true queue-control evidence: actual rate-limit or 5xx retry provenance, user cancellation against an in-flight real provider request, and app-restart partial resume through the packaged UI.

## Lane D App-Surface Recheck

2026-06-21 KST Lane D produced the image UI evidence bundle at `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/manifest.json` (`sha256:caa4036a28a40886a953a1b547059fd1073cabe35e67f73dc56418b02c02676f`). The bundle confirms the five stored successful image turns can feed review/compositor/usage surfaces, but it does not contain a genuine live `429`/`5xx` retry event, user cancellation event, or packaged restart-resume trace. DF-233 remains open until those three events are produced against real provider jobs.

## Lane G Closure Recheck

2026-06-21 KST Lane G rechecked #147 and preserved the blocker in
`docs/live-evidence/codex-image/lane-g-closure-recheck-20260621/issue-closure-evidence.json`.
No new real provider 429/5xx, in-flight cancellation, or packaged restart-resume
artifact was found. The issue remains blocked on those live queue-control events.

## Generate Stage Product Hook

2026-06-21 KST product update: production `codex` Generate-stage runs now enter
`runCodexGenerateStageJob`, which creates live slide placeholders, routes each
approved layout bundle through `runCodexLiveSlideGenerationSession`, stores PNG,
metadata, and provenance sidecars through the image artifact store contract, and
reports live queue progress back into the outer provider job. The desktop image
client maps Codex App Server image-generation notifications into Codex OAuth
image responses; it does not use OpenAI API keys.

This closes the local product gap where the production Codex route could pass
the image gate but still fall back to the mock slide loop. DF-233 remains open
until a packaged app run captures real 429/5xx retry provenance, in-flight user
cancellation, and restart-resume evidence against real provider jobs.

## Generate Stage Queue Evidence Export

2026-06-21 KST product update: production `codex` Generate-stage runs now also
persist a DF-233 queue evidence JSON bundle through the same browser image
artifact store used for PNG/metadata/provenance sidecars. The outer provider job
partial result now carries `queueEvidencePath`, pointing to
`projects/{projectId}/live-evidence/df233-image-queue-{jobId}.json`.

The export does not claim DF-233 is closed by itself. It makes the next packaged
Codex OAuth image run auditable by preserving the exact queue result fields
needed for closure review: queue status, progress, retry provenance, failure
records, provider job states, prompt usage, concurrency evidence, and the stored
image artifact paths produced by that run. The exported JSON now also embeds the
`evaluateLiveImageQueueEvidence` result, so malformed retry/cancel/progress
evidence remains visibly `blocked` inside the bundle instead of looking like a
closure-ready artifact. DF-233 still needs a real packaged run whose exported
bundle contains genuine 429/5xx retry provenance, in-flight user cancellation,
and restart-resume evidence.

## Queue Progress Evidence Gate

2026-06-21 KST local update: queue evidence approval now compares reported
progress and status against the recorded slides, failures, and slide count. A
bundle that claims five completed images without five recorded slide outputs
blocks with `queue_progress_count_mismatch`, and a bundle whose status reports
success while failures remain recorded blocks with `queue_status_count_mismatch`.
This keeps the exported DF-233 JSON from overstating completion before auditors
review the real packaged Codex OAuth queue run.

## Provider Failure Evidence Gate

2026-06-21 KST local update: non-cancelled provider failures now require the
failed provider job and matching slide-generation prompt usage before DF-233
queue evidence can pass. A bundle that lists a failed slide without the
corresponding provider job blocks with `failure_job_not_found`, and a bundle
that omits prompt usage linkage blocks with `failure_prompt_usage_missing`.
This prevents a failed provider event from being represented only as a slide
failure row with no auditable job/request trail.

## Recovery Snapshot Evidence Gate

2026-06-21 KST local update: provider job recovery snapshots now parse only
when every recorded job entry is valid and `currentJobId` points at one of those
jobs. A packaged restart-resume bundle that mixes one valid job with a malformed
cancel/retry job no longer recovers a partial snapshot, which prevents DF-233
resume evidence from hiding the broken job that mattered for queue closure.

2026-06-21 KST local update: restart-resume queue evidence now rejects any
`resumedArtifactIds` entry that already appeared in `completedArtifactIdsBefore`.
A restart bundle can no longer claim a pre-restart completed image was also
resumed after restart; the overlap blocks as `invalid_restart_resume_evidence`.

## Queue Evidence Identity Gate

2026-06-21 KST local update: queue evidence now rejects blank or
boundary-whitespace-padded context, job, and bundle identities with
`noncanonical_queue_evidence_identity`. A retry bundle whose padded `jobId` and
`bundleId` values match each other no longer passes just because every copied
field preserves the same non-canonical string.

## Queue Retry Delay Validity Gate

2026-06-21 KST local update: queue evidence now rejects retry provenance and
failed-slide retry histories whose delay values are negative, fractional, or
non-finite with `retry_delay_invalid`. A retry provenance event with
`delayMs: -1` no longer satisfies DF-233 429/5xx backoff evidence even when the
job id, prompt bundle, slide number, and attempt metadata otherwise match.

## Stored Artifact Production Path Gate

2026-06-22 KST local update: exported queue evidence now rejects stored image
artifact paths whose otherwise versioned project image path contains
non-production markers such as `tmp`, `temp`, `sample`, `example`,
`placeholder`, `generic`, or `observer`. A path like
`projects/tmp/slides/images/slide_001.v1.png` now blocks with
`stored_image_artifact_path_invalid` instead of satisfying DF-233 completed-slide
storage evidence.

## Project Folder Evidence Export

2026-06-22 KST product update: local project folder export now includes
project-scoped browser image artifact writes in `projectArtifactWrites`. The
export path captures DF-233 queue evidence written at
`projects/{projectId}/live-evidence/df233-image-queue-{jobId}.json` alongside
the stored PNG/metadata/provenance sidecars for the same project, redacts text
artifact payloads, preserves base64 image binaries, and filters out other
projects. This gives the next packaged Codex OAuth image run a product-supported
way to hand auditors the queue artifact, but DF-233 remains open until that run
contains genuine 429/5xx retry provenance, in-flight cancellation, and
restart-resume evidence.

## Live Generate Export Smoke

2026-06-22 KST product-run smoke tightened the desktop Codex image App Server
response schema with `additionalProperties: false`, extended image structured
turns to a 600000ms timeout, and then ran one real Codex image turn through the
product Generate runner. The latest rerun completed in `185181ms` and wrote
queue evidence at
`projects/df244_generate_export_smoke_20260622/live-evidence/df233-image-queue-job_generate_export_smoke_1.json`,
recorded one succeeded Codex image job, stored
`projects/df244_generate_export_smoke_20260622/slides/images/slide_001.v1.png`,
captured slide-generation prompt usage, preserved concurrency evidence, and
validated the queue bundle as `ready` for the successful one-slide path. This
does not exercise transient 429/5xx retry, in-flight cancellation, or
restart-resume, so DF-233 remains open for those real packaged-run events.

## Product Queue-Control Smoke

2026-06-22 KST product queue-control smoke:
`scripts/run-df233-queue-controls-product-evidence-smoke.ts` runs the product
queue and DF-233 writer in three deterministic scenarios. The retry run throws
two `server` / upstream `503` failures, records retry provenance
`server:1:100` and `server:2:200`, succeeds on attempt 3, and writes ready
queue evidence at
`projects/df233_queue_retry_smoke_20260622/live-evidence/df233-image-queue-retry_product_run_20260622.json`
(`sha256:c25ade822845e8a8d7b34a00d0a4f49384132ba933ca763cb983c207cb86798f`).
The cancellation run requests cancellation while the provider call is in flight,
rejects the late returned image instead of accepting it, records the job as
cancelled, and writes ready queue evidence at
`projects/df233_queue_cancel_smoke_20260622/live-evidence/df233-image-queue-cancel_product_run_20260622.json`
(`sha256:285b66b7c12e83e47f975b2254cf1261f638055be63b096e4bfbbde175fa5354`).
The restart-resume run starts with slide 1 completed, generates only slide 2,
includes restart-resume proof for the pending/resumed slide 2 artifact, and
writes ready queue evidence at
`projects/df233_queue_resume_smoke_20260622/live-evidence/df233-image-queue-resume_product_run_20260622.json`
(`sha256:3ae427c48714afcd45ed9592e12a50cec65d69ce6cd70e642cb017de59cb9fa9`).
The summary at
`docs/live-evidence/codex-image/df233-queue-controls-smoke-20260622/summary.json`
(`sha256:ef3049044d2c844673ee41973280e5fcd44953da771991616b73e371e2ce8a51`)
proves all three exported evidence files validate as `ready`. DF-233 remains open
until equivalent retry, cancellation, and restart-resume evidence is captured
from a packaged Codex OAuth image run against real provider jobs.

## Real Codex OAuth Cancellation Smoke

2026-06-22 KST real-provider smoke:
`scripts/run-live-codex-cancel-product-evidence-smoke.ts` ran a Codex OAuth
App Server image turn through the product slide generation queue, requested
cancellation immediately after the live request was dispatched, waited for the
real turn to finish, and verified the returned image was not written to
`projects/{projectId}/slides/images/...`. The run completed App Server thread
`019eed0f-b516-7cc1-9b4d-f53ca1ec1d7c`, turn
`019eed0f-b799-7f91-98d7-67617abcb758`, in `254542ms` with no protocol errors.

The smoke summary at
`docs/live-evidence/codex-image/df243-live-codex-cancel-smoke-20260622/summary.json`
(`sha256:520a4fe9120aefd470299e26bab224de0b00d9e491553f54ba95108311a7101d`)
records `wroteSlideImageArtifacts: false`; the exported DF-233 queue evidence at
`projects/df243_live_codex_cancel_smoke_20260622/live-evidence/df233-image-queue-live_codex_cancel_product_run_20260622.json`
(`sha256:65ebd4608aa3df5a55144f5f8fe747ea49b3461e03982746a8d413e4ec4d8641`)
validates as `ready` for the cancelled queue path. This proves the real Codex
OAuth queue now rejects late in-flight image output before storage, but DF-233
still needs packaged app evidence for real retry, cancellation, and restart
resume before issue closure.
