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
- `src/lib/live-image-queue-evidence.ts`, `src/lib/live-image-queue-concurrency.ts`, `src/lib/live-image-queue-cancellation.ts`, `src/lib/live-image-queue-retry-slide.ts`, and `src/lib/live-image-queue-retry-delay.ts` reject missing concurrency proof with `missing_concurrency_evidence`, zero or invalid requested/effective concurrency limits with `invalid_concurrency_evidence`, observed concurrency above the effective throttle with `concurrency_limit_exceeded`, retry evidence that is not anchored to a recorded provider job and slide-generation prompt usage, retry event counts or attempt sequences that do not match the final job attempt, retry events tied to a different bundle or slide than the retried job output/failure, retry delay histories that differ from failed slide evidence with `retry_delay_history_mismatch`, non-transient retry failure kinds, cancelled provider jobs without matching slide failure evidence with `cancelled_job_missing_failure`, and cancellation failures without a cancelled provider job, matching attempt count, preserved cancel signal, or matching slide-generation prompt bundle.
- `isCancellationRequested` prevents later provider calls after a user cancellation and records cancelled jobs plus slide failures instead of leaving background work running.
- `src/lib/slide-generation-queue-live-controls.test.ts` covers bounded `rate_limit` retry, max-attempt `server` retry provenance, later-call cancellation, in-flight cancellation before provider completion, completed-slide partial resume, and unfinished-slide regeneration during partial resume. `src/lib/slide-generation-queue-resume-lineage.test.ts` covers stale prompt-lineage and stale layout-reference regeneration during partial resume. `src/lib/slide-generation-queue-cancellation-backoff.test.ts` covers cancellation during retry backoff without starting the next attempt. `src/lib/live-image-queue-concurrency.test.ts` covers missing, zero-limit, and over-limit concurrency evidence and proves queue execution records the observed throttle. `src/lib/live-image-queue-cancelled-job.test.ts` covers cancelled provider jobs that are missing slide failure evidence. `src/lib/live-image-queue-retry-delay.test.ts` covers false-ready retry evidence whose provenance delay does not match the failed slide retry delay history.

## Verification

- `bun test src/lib/slide-generation-queue-resume-lineage.test.ts src/lib/slide-generation-queue-cancellation-backoff.test.ts src/lib/slide-generation-queue-live-controls.test.ts src/lib/slide-generation-queue.test.ts src/lib/live-background-batch.test.ts`
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
