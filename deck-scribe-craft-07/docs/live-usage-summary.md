# Live Usage Summary

Date: 2026-06-19

Ticket: DF-244

## Contract

Live jobs must show enough usage context for a user to understand what ran under their account. Each stage row must have a unique displayable stage id and include provider, duration, and retry count.

When a provider supplies usage or cost data, the project summary records it. Cost is displayed only when it can be labelled as exact or estimated; otherwise it remains hidden. Estimated values render as `cost estimate`.

Before image generation, the UI must make API key and billing usage visible and require confirmation when the image provider uses the user's API key. Image billing confirmation must carry a persisted `confirmationEvidencePath` JSON record that is not synthetic, not template/sample/example/placeholder evidence, and not a developer-local absolute path, even when `apiKeyRequired: false`; `userConfirmed: true` plus display copy alone is not enough Live evidence.

## Blocking Rules

`src/lib/live-usage-summary.ts` returns these issue codes:

- `missing_provider_usage_summary`: provider supplied usage/cost data but the project summary did not record token, image, or cost fields.
- `missing_usage_stage_identity`: a usage summary row lacks a displayable stage id.
- `duplicate_usage_stage_identity`: a usage summary row repeats another stage id.
- `invalid_usage_provider_kind`: a usage summary row reports a provider outside the DeckForge provider taxonomy.
- `incomplete_text_token_usage`: Codex text usage evidence is missing either input or output token counts.
- `missing_image_usage_count`: image generation usage evidence is missing the generated image count.
- `invalid_usage_amount`: token or image usage counts are negative, fractional, or not finite.
- `invalid_duration`: stage duration is missing, negative, or not finite.
- `invalid_retry_count`: retry count is missing, negative, or not an integer.
- `invalid_cost_amount`: cost amounts are negative or not finite.
- `invalid_cost_label`: cost label values outside `actual`, `estimate`, or `hidden` are rejected before display.
- `unlabelled_estimated_cost`: cost is present but neither labelled exact nor labelled estimated.
- `estimated_cost_marked_actual`: estimated provider cost is displayed as an exact charge.
- `missing_image_billing_confirmation`: image generation lacks visible API key/billing confirmation or persisted confirmation evidence.

## Local Evidence

- `src/lib/live-usage-summary.test.ts` verifies stage-level provider/duration/retry display, estimated cost formatting, usage recording, empty usage-object blockers, incomplete text/image usage blockers, invalid usage/cost amount blockers, estimated-cost-as-actual blockers, persisted API-key billing confirmation evidence blockers, developer-local billing evidence path blockers, and image billing confirmation blockers. `src/lib/live-usage-summary-stage-identity.test.ts` verifies that blank or duplicated stage ids and unsupported runtime provider kinds cannot pass as displayable Live usage rows. `src/lib/live-usage-summary-billing-evidence.test.ts` verifies that confirmed-looking image billing payloads without persisted confirmation evidence or with template confirmation evidence stay blocked and render as not confirmed even when `apiKeyRequired: false`. `src/lib/live-usage-billing-evidence.ts` centralizes that confirmation evidence path rule for summary approval, formatted summaries, and the progress view. `src/lib/live-usage-summary-cost-label.test.ts` verifies that unsupported runtime cost labels cannot render provider costs as if they were valid estimates. `src/lib/live-usage-summary-redaction.test.ts` verifies that image billing labels are redacted before summary display.
- `src/lib/live-app-server-usage-summary.ts` converts `thread/tokenUsage/updated` notifications from `codex app-server --stdio` into `LiveUsageStageSummary.usage`, and deliberately leaves `usage` empty when the provider supplied a malformed usage notification so `missing_provider_usage_summary` blocks the summary.
- `src/lib/provider-job-progress-view.ts` and `src/components/deck/ProviderJobProgressPanel.tsx` expose app-surface provider id, execution duration, retry count, valid token/image usage, and finite estimated provider cost as `cost estimate` while still preserving job status, retry availability, recovered state, partial artifacts, redacted failure messages, and redacted image billing labels.
- `src/lib/audit-log.ts` records provider usage summaries into report audit events, renders `estimatedCostUsd` as `cost estimate`, not as an exact charge, and only preserves confirmed image billing disclosure labels when persisted confirmation evidence is valid.

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

## App Surface Usage Display

The provider job progress panel now renders DF-244 usage context for any job that carries `ProviderUsageSummary`:

- provider id under `제공자`
- measured execution duration under `실행 시간`
- retry count as `retries N`
- token/image usage items such as `input 25006`, `output 141`, or `images 1`
- `estimatedCostUsd` only as `cost estimate $...`, never as exact `cost $...`
- invalid provider payload amounts such as negative tokens, fractional token counts, unsupported cost labels, or non-finite costs are omitted from the visible usage list instead of being rendered as real usage
- image API key billing disclosure labels such as `API key billing confirmed` only when the payload includes a non-synthetic, non-local `confirmationEvidencePath` JSON record that is not a template/sample/example/placeholder bundle
- secret-like text inside displayed image billing disclosure labels is redacted before the usage summary, progress panel, or audit report can show it
- unconfirmed billing payloads, even when `apiKeyRequired: false`, or confirmed-looking payloads without persisted confirmation evidence, render as `API key billing not confirmed` instead of reusing a provider-supplied confirmed-looking label

`src/lib/provider-job-progress-view.test.ts` locks the app-progress view so invalid provider usage values such as `input -1`, fractional outputs, or `cost estimate $NaN` are not shown to the user, unconfirmed billing payloads cannot display confirmed-looking labels, and developer-local absolute image billing evidence paths render as `API key billing not confirmed`. `src/lib/provider-job-progress-view-redaction.test.ts` verifies the progress view redacts secret-like text from image billing labels.

`src/components/deck/ProviderJobProgressPanel.integration.test.tsx` locks the rendered app surface for the live Codex usage probe shape: provider `codex`, duration `7158ms`, `retries 1`, `input 25006`, `output 141`, and `cost estimate $0.0400`. It also locks the image usage shape with `images 5`, `cost estimate $0.1800`, and `API key billing confirmed`.

The same integration surface now blocks misleading confirmation copy when the image billing disclosure says `userConfirmed: false`, omits persisted API-key billing confirmation evidence, or only points at developer-local evidence.

`formatLiveUsageSummary` and `src/lib/audit-log.ts` preserve confirmed image billing disclosure labels only when persisted confirmation evidence is valid; missing, invalid, or evidence-less confirmed-looking payloads render as `API key billing not confirmed` while secret-like text is still redacted from displayed labels.

## Remaining Live Evidence

The local contract, one live Codex text usage probe, app progress-panel usage display with invalid provider payload omission, blank or duplicated stage-id and unsupported provider-kind blockers, incomplete text/image usage blockers, invalid usage/cost amount and cost-label blockers, persisted API-key billing confirmation evidence blockers, developer-local and template billing evidence path blockers, and secret-redacted formatted-summary/progress/report image billing disclosure display are ready, but DF-244 still needs manual QA against the packaged app surface with real provider image billing/API-key disclosure payloads.
