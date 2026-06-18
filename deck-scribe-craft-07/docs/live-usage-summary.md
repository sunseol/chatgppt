# Live Usage Summary

Date: 2026-06-19

Ticket: DF-244

## Contract

Live jobs must show enough usage context for a user to understand what ran under their account. Each stage row must include provider, duration, and retry count.

When a provider supplies usage or cost data, the project summary records it. Cost is displayed only when it can be labelled as exact or estimated; otherwise it remains hidden. Estimated values render as `cost estimate`.

Before image generation, the UI must make API key and billing usage visible and require confirmation when the image provider uses the user's API key.

## Blocking Rules

`src/lib/live-usage-summary.ts` returns these issue codes:

- `missing_provider_usage_summary`: provider supplied usage/cost data but the project summary did not record it.
- `invalid_duration`: stage duration is missing, negative, or not finite.
- `invalid_retry_count`: retry count is missing, negative, or not an integer.
- `unlabelled_estimated_cost`: cost is present but neither labelled exact nor labelled estimated.
- `estimated_cost_marked_actual`: estimated provider cost is displayed as an exact charge.
- `missing_image_billing_confirmation`: image generation lacks visible API key or billing confirmation.

## Local Evidence

- `src/lib/live-usage-summary.test.ts` verifies stage-level provider/duration/retry display, estimated cost formatting, usage recording, estimated-cost-as-actual blockers, and image billing confirmation blockers.
- `src/lib/live-app-server-usage-summary.ts` converts `thread/tokenUsage/updated` notifications from `codex app-server --stdio` into `LiveUsageStageSummary.usage`, and deliberately leaves `usage` empty when the provider supplied a malformed usage notification so `missing_provider_usage_summary` blocks the summary.
- `src/lib/provider-job-progress-view.ts` already exposes job status, retry availability, recovered state, partial artifacts, and redacted failure messages.
- `src/lib/audit-log.ts` records provider usage summaries into report audit events and renders `estimatedCostUsd` as `cost estimate`, not as an exact charge.

## Live Codex Usage Probe

On 2026-06-19 a live `codex app-server --stdio` structured-turn probe completed with:

- thread id: `019edc53-3950-74e1-8287-36d66f29e87e`
- turn id: `019edc53-3bfe-76d3-912d-31769ee3fd3f`
- duration: 7,158 ms
- observed notification: `thread/tokenUsage/updated`
- total input tokens: 25,006
- total output tokens: 141
- cached input tokens: 2,432
- reasoning output tokens: 118

`createCodexAppServerUsageStageSummary` maps that notification to a DF-244 stage summary with provider `codex`, duration, retry count, and usage `{ inputTokens: 25006, outputTokens: 141 }`. `evaluateLiveUsageSummary` returns `ready` for that text usage stage, and `formatLiveUsageSummary` renders `input 25006 · output 141`.

## Remaining Live Evidence

The local contract and one live Codex text usage probe are ready, but DF-244 still needs usage summary manual QA in the app surface plus real image billing/API-key disclosure evidence.
