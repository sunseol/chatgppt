# Live Image Queue Controls

Date: 2026-06-19

Ticket: DF-233

Status: Partial, external evidence required

## Contract Summary

DF-233 requires the live image queue to throttle concurrent work, retry only transient provider failures, support user cancellation, and resume without regenerating completed slides. The local queue now keeps those controls in the slide generation boundary so production runs cannot silently rerun successful images or treat cancellation as a normal success.

## Local Evidence

- `src/lib/slide-generation-queue.ts` still bounds concurrency with `maxParallel`, normalizes non-finite parallel limits back to the default finite throttle, and accepts `completedSlides` so partial resume skips only already generated `ready` or `approved` slide numbers whose descriptors exactly match the current live image descriptor: provider, 16:9 aspect, layout reference, and `slide_generation@v1` prompt lineage. It regenerates stale prompt-lineage, stale layout-reference, unfinished `pending`, or `generating` entries.
- `src/lib/slide-generation-retry-policy.ts` classifies retry decisions through image provider failure kinds and applies exponential backoff for transient `rate_limit`, `server`, and unknown failures only when a retry policy allows more attempts.
- `src/lib/slide-generation-queue-executor.ts` records retry provenance on failed slides and successful-after-retry slides: job id, bundle id, slide number, attempt, failure kind, message, and retry delay history. It also rechecks cancellation after retry backoff before calling `manager.retry`, so a user cancellation during backoff cannot start or count a new provider attempt. Provider output is checked again after an in-flight image call returns, so an image that completes after user cancellation is recorded as cancelled rather than accepted.
- `SlideGenerationQueueResult.retryProvenance` preserves retry events even when a slide eventually succeeds, so live QA can audit transient `rate_limit` or `server` recovery instead of seeing only the final success.
- `src/lib/live-image-queue-evidence.ts` and `src/lib/live-image-queue-retry-slide.ts` reject retry evidence that is not anchored to a recorded provider job and slide-generation prompt usage, retry event counts or attempt sequences that do not match the final job attempt, retry events tied to a different bundle or slide than the retried job output/failure, non-transient retry failure kinds, and cancellation failures without a cancelled provider job, matching attempt count, preserved cancel signal, or matching slide-generation prompt bundle.
- `isCancellationRequested` prevents later provider calls after a user cancellation and records cancelled jobs plus slide failures instead of leaving background work running.
- `src/lib/slide-generation-queue-live-controls.test.ts` covers bounded `rate_limit` retry, max-attempt `server` retry provenance, later-call cancellation, in-flight cancellation before provider completion, completed-slide partial resume, and unfinished-slide regeneration during partial resume. `src/lib/slide-generation-queue-resume-lineage.test.ts` covers stale prompt-lineage and stale layout-reference regeneration during partial resume. `src/lib/slide-generation-queue-cancellation-backoff.test.ts` covers cancellation during retry backoff without starting the next attempt.

## Verification

- `bun test src/lib/slide-generation-queue-resume-lineage.test.ts src/lib/slide-generation-queue-cancellation-backoff.test.ts src/lib/slide-generation-queue-live-controls.test.ts src/lib/slide-generation-queue.test.ts src/lib/live-background-batch.test.ts`
- `bun test src/lib/live-image-queue-retry-slide.test.ts src/lib/live-image-queue-cancel-attempt.test.ts src/lib/live-image-queue-evidence.test.ts`
- `bun run typecheck`
- `bun run lint`

## Remaining Live Work

The current repository has not yet executed live throttling against a real image provider. DF-233 remains open until a production image run captures actual rate limit or 5xx retry evidence, user cancellation manual QA, and partial resume after app restart with real stored image artifacts.
