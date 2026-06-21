# Live Usage Summary

Date: 2026-06-19

Ticket: DF-244

## Contract

Live jobs must show enough usage context for a user to understand what ran under their account. Each stage row must have a unique, canonical, displayable stage id and include provider, positive observed duration, and retry count.

When a provider supplies usage or cost data, the project summary records it. Cost is displayed only when it can be labelled as exact or estimated; otherwise it remains hidden. Estimated values render as `cost estimate`. Malformed supplied numeric usage or cost fields are preserved as invalid evidence and blocked instead of being silently dropped from the summary.

Before image generation, the UI must make Codex account image usage visible and require confirmation because generation runs through the user's authenticated Codex session. Image usage confirmation must report `apiKeyRequired: false`, carry a canonical persisted `confirmationEvidencePath` JSON record under the product path `usage/<project>/<job>/image-billing-confirmation.json`, match the current provider job id, is not synthetic, is not boundary-whitespace-padded, does not use fallback `unknown` project or job segments, is not template/sample/example/placeholder evidence, and is not a developer-local absolute path; `userConfirmed: true` plus display copy or API-key-required disclosure alone is not enough Live evidence.

Image billing confirmation is required only when a stage carries an explicit image signal: `providerKind: "openaiImage"`, an image count, or an image billing disclosure payload. A bare `stageId: "generate"` is not sufficient by itself, so text usage reported under a generate-labelled stage cannot be falsely blocked as image generation.

## Blocking Rules

`src/lib/live-usage-summary.ts` returns these issue codes:

- `missing_provider_usage_summary`: provider supplied usage/cost data but the project summary did not record token, image, or cost fields.
- `missing_usage_stage_identity`: a usage summary row lacks a displayable stage id.
- `noncanonical_usage_stage_identity`: a usage summary row only becomes displayable after trimming boundary whitespace.
- `duplicate_usage_stage_identity`: a usage summary row repeats another stage id.
- `invalid_usage_provider_kind`: a usage summary row reports a provider outside the DeckForge provider taxonomy.
- `incomplete_text_token_usage`: Codex text usage evidence is missing either input or output token counts.
- `missing_image_usage_count`: image generation usage evidence is missing the generated image count.
- `invalid_usage_amount`: token or image usage counts are negative, fractional, malformed, or not finite.
- `invalid_duration`: stage duration is missing, zero, negative, or not finite.
- `invalid_retry_count`: retry count is missing, negative, or not an integer.
- `invalid_cost_amount`: cost amounts are negative, malformed, or not finite.
- `invalid_cost_label`: cost label values outside `actual`, `estimate`, or `hidden` are rejected before display.
- `unlabelled_estimated_cost`: cost is present but neither labelled exact nor labelled estimated.
- `estimated_cost_marked_actual`: estimated provider cost is displayed as an exact charge.
- `missing_image_billing_confirmation`: image generation lacks visible Codex OAuth image usage confirmation, `apiKeyRequired: false`, persisted confirmation evidence, or a confirmation path bound to the same provider job id.

## Local Evidence

- `src/lib/live-usage-summary.test.ts` verifies stage-level provider/duration/retry display, estimated cost formatting, usage recording, empty usage-object blockers, incomplete text/image usage blockers, estimated-cost-as-actual blockers, persisted Codex image usage confirmation evidence blockers, developer-local confirmation evidence path blockers, API-key-required confirmation blockers, image usage confirmation blockers, and the non-image generate-stage regression where complete Codex text usage remains ready without image billing confirmation. `src/lib/live-usage-summary-amounts.test.ts` verifies invalid usage/cost amount blockers. `src/lib/live-usage-billing-same-job.test.ts` verifies that summary approval, formatted summaries, app progress, and report audit lines reject confirmation evidence copied from a different provider job. `src/lib/live-usage-summary-duration-evidence.test.ts` verifies that a zero-duration provider stage cannot satisfy observed latency evidence. `src/lib/live-usage-summary-stage-identity.test.ts` verifies that blank, boundary-whitespace-padded, or duplicated stage ids and unsupported runtime provider kinds cannot pass as displayable Live usage rows. `src/lib/live-usage-summary-billing-evidence.test.ts` verifies that confirmed-looking image usage payloads without persisted confirmation evidence, with API-key-required disclosure, with template confirmation evidence, with generic confirmation JSON filenames, with fallback `unknown` project/job segments, or with a confirmation filename that is not bound to both project and job stay blocked and render as not confirmed. `src/lib/live-usage-billing-evidence-identity.test.ts` verifies that boundary-whitespace-padded confirmation paths also stay blocked and render as not confirmed. `src/lib/live-usage-billing-evidence.ts` centralizes the Codex OAuth confirmation rule for summary approval, formatted summaries, report audit lines, and the progress view. `src/lib/live-usage-summary-cost-label.test.ts` verifies that unsupported runtime cost labels cannot render provider costs as if they were valid estimates. `src/lib/live-usage-summary-redaction.test.ts` verifies that image usage labels are redacted before summary display.
- `src/lib/live-app-server-usage-summary.ts` converts `thread/tokenUsage/updated` notifications from `codex app-server --stdio` into `LiveUsageStageSummary.usage`, preserves richer App Server `usageSummary` or `usage` payload fields such as `imageCount`, `estimatedCostUsd`, and `imageBillingDisclosure`, and preserves malformed supplied numeric fields as invalid values so `invalid_usage_amount` or `invalid_cost_amount` blocks the summary.
- `src/lib/live-image-billing-confirmation.ts` persists the pre-generation Codex OAuth image usage confirmation record into product storage as `usage/<project>/<job>/image-billing-confirmation.json`, returns the matching `ProviderImageBillingDisclosure`, and refuses to treat a declined or unpersisted confirmation as evidence.
- `src/lib/generate-stage-recovery.ts` owns Generate-stage job recovery storage, and `src/components/deck/GenerateStage.tsx` now records the persisted Codex image confirmation disclosure on Codex image-generation jobs before the job starts.
- `scripts/lane-d-live-usage-confirmation.mjs` resolves the packaged Lane D usage bundle from a real persisted Codex OAuth confirmation JSON. `scripts/lane-d-live-usage-confirmation.test.mjs` verifies that only a canonical record whose `evidencePath` matches its product storage location can change the generated usage summary from `missing_app_surface_pre_generation_confirmation` to `confirmed_app_surface_pre_generation_codex_oauth`.
- `src/lib/provider-job-progress-view.ts` and `src/components/deck/ProviderJobProgressPanel.tsx` expose app-surface provider id, execution duration, retry count, valid token/image usage, and finite estimated provider cost as `cost estimate` while still preserving job status, retry availability, recovered state, partial artifacts, redacted failure messages, and redacted image usage labels.
- `src/lib/audit-log.ts` records provider usage summaries into report audit events, renders `estimatedCostUsd` as `cost estimate`, not as an exact charge, and only preserves confirmed image usage disclosure labels when persisted confirmation evidence is valid.

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

## App Server Rich Usage Preservation

The App Server usage bridge keeps the `thread/tokenUsage/updated` token totals
and now also preserves valid richer `usageSummary` or `usage` payload fields
when the notification supplies image usage evidence. Preserved fields include
`imageCount`, `estimatedCostUsd`, and `imageBillingDisclosure` with its
`confirmationEvidencePath`. An `estimatedCostUsd` value sets the stage
`costLabel` to `estimate`, so display surfaces render `cost estimate` and never
turn an App Server estimate into an exact charge.

Malformed provider numeric payloads are preserved as invalid usage evidence and
block as `invalid_usage_amount` or `invalid_cost_amount` instead of being hidden
from the summary. This does not close DF-244 by itself; the
remaining closure evidence is still packaged-app manual QA with real image
usage payloads and the persisted pre-generation confirmation JSON from the same
Codex OAuth image run.

## App Surface Usage Display

The provider job progress panel now renders DF-244 usage context for any job that carries `ProviderUsageSummary`:

- provider id under `제공자`
- measured execution duration under `실행 시간`
- retry count as `retries N`
- token/image usage items such as `input 25006`, `output 141`, or `images 1`
- `estimatedCostUsd` only as `cost estimate $...`, never as exact `cost $...`
- invalid provider payload amounts such as negative tokens, fractional token counts, unsupported cost labels, or non-finite costs are omitted from the visible usage list instead of being rendered as real usage
- Codex image usage disclosure labels such as `Codex image usage confirmed` only when the payload reports `apiKeyRequired: false`, includes a canonical non-synthetic, non-local `confirmationEvidencePath` JSON record under `usage/<project>/<job>/image-billing-confirmation.json`, matches the current provider job id, and is not boundary-whitespace-padded, not a fallback `unknown` project/job bundle, and not a template/sample/example/placeholder bundle
- secret-like text inside displayed image usage disclosure labels is redacted before the usage summary, progress panel, or audit report can show it
- unconfirmed image usage payloads or confirmed-looking payloads without persisted confirmation evidence render as `Codex image usage not confirmed` instead of reusing a provider-supplied confirmed-looking label

`src/lib/provider-job-progress-view.test.ts` locks the app-progress view so invalid provider usage values such as `input -1`, fractional outputs, or `cost estimate $NaN` are not shown to the user, unconfirmed billing payloads cannot display confirmed-looking labels, and developer-local absolute image usage evidence paths render as `Codex image usage not confirmed`. `src/lib/provider-job-progress-view-redaction.test.ts` verifies the progress view redacts secret-like text from image usage labels.

`src/components/deck/ProviderJobProgressPanel.integration.test.tsx` locks the rendered app surface for the live Codex usage probe shape: provider `codex`, duration `7158ms`, `retries 1`, `input 25006`, `output 141`, and `cost estimate $0.0400`. It also locks the image usage shape with `images 5`, `cost estimate $0.1800`, and `Codex image usage confirmed`.

The same integration surface now blocks misleading confirmation copy when the image usage disclosure says `userConfirmed: false`, says `apiKeyRequired: true`, omits persisted Codex image usage confirmation evidence, or only points at developer-local evidence.

`formatLiveUsageSummary` and `src/lib/audit-log.ts` preserve confirmed image usage disclosure labels only when persisted confirmation evidence is valid and the disclosure is Codex OAuth-shaped with `apiKeyRequired: false`; missing, invalid, API-key-required, or evidence-less confirmed-looking payloads render as `Codex image usage not confirmed` while secret-like text is still redacted from displayed labels.

## Remaining Live Evidence

The local contract, one live Codex text usage probe, App Server rich usage payload preservation including malformed numeric usage/cost blockers, app progress-panel usage display with invalid provider payload omission, blank, boundary-whitespace-padded, or duplicated stage-id and unsupported provider-kind blockers, zero-duration latency evidence blockers, incomplete text/image usage blockers, invalid usage/cost amount and cost-label blockers, persisted Codex image usage confirmation evidence blockers, API-key-required confirmation blockers, developer-local, template, generic, boundary-whitespace-padded, fallback-unknown, and non-project/job-bound confirmation evidence path blockers, Generate-stage Codex OAuth confirmation persistence, and secret-redacted formatted-summary/progress/report image usage disclosure display are ready, but DF-244 still needs manual QA against the packaged app surface with real provider image Codex usage disclosure payloads.

## Lane D Image Usage Recheck

2026-06-21 KST Lane D packaged actual Codex image latency/count display evidence:

- Usage display: `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/df244-usage-display.html`
- Usage display hash: `sha256:d8d136e45e91916f30908b7e66b336359596d1a25a596aff3de5ecfcb292cffc`
- Usage summary: `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/df244-usage-summary.json`
- Usage summary hash: `sha256:01b6043d35d12a744ffd898486a8ae7157110fd7561ce2c1c5e96587688dd4a9`
- Image count: `5`
- Total measured image latency: `197953ms`

The display intentionally keeps cost hidden because the Codex image sidecars do not supply a billable cost value. DF-244 remains open because no persisted pre-generation user-confirmation record from the packaged app surface exists.

The Lane D evidence generator now consumes a real
`usage/<project>/<job>/image-billing-confirmation.json` record when one is
present under the product project storage tree. The current committed bundle
still reports `missing_app_surface_pre_generation_confirmation`, which is
correct for the available evidence because no packaged-app confirmation record
has been captured yet.

## Live Image Usage Update

2026-06-21 KST Lane B captured real Codex image usage evidence from the authenticated image route:

- Single-image route-lock run: `imageCount: 1`, latency `33496ms`, evidence `docs/live-evidence/codex-image/df230-df231-live-artifact-summary.json`
- Five-background batch: `imageCount: 5` total across five live turns, evidence `docs/live-evidence/codex-image/df232-five-background-protocol-summary.json`
- Batch latencies: `56466ms`, `49422ms`, `30413ms`, `28803ms`, `32849ms`
- Selected-slide regeneration: `imageCount: 1`, latency `63784ms`, evidence `docs/live-evidence/codex-image/df235-selected-slide-regeneration-summary.json`
- Provider/auth: `codex` / `codex_session`

No exact provider cost was exposed by the App Server image protocol, so cost remains hidden rather than estimated as an exact charge.

## 2026-06-21 KST lane evidence update

This ticket remains hard-blocked on packaged-app usage-summary QA with real
image Codex usage disclosure payloads. The available DMG mounted and its
SHA-256 matched the committed checksum, but `/Volumes/DeckForge/DeckForge.app`
failed `codesign --verify --deep --strict --verbose=2` and `spctl --assess
--type execute --verbose=4` with `code has no resources but signature indicates
they must be present`. This lane also has no persisted real image usage
confirmation JSON artifact in `release-artifacts`. See
`docs/live-research-lane-blockers-2026-06-21.md`.

## Lane G Closure Recheck

2026-06-21 KST Lane G rechecked #154 and preserved the blocker in
`docs/live-evidence/codex-image/lane-g-closure-recheck-20260621/issue-closure-evidence.json`.
The Lane D usage summary proves `5` actual Codex image generations and
`197953ms` total measured image latency in the display evidence, with hash
`sha256:01b6043d35d12a744ffd898486a8ae7157110fd7561ce2c1c5e96587688dd4a9`.
The issue remains open because no persisted, non-synthetic pre-generation
confirmation JSON from the packaged app surface exists.

## Generate Stage Confirmation Persistence

2026-06-21 KST product update: the Generate stage now calls
`confirmAndPersistLiveImageBilling` before a production `codex` image job starts.
When the user confirms, the job records `imageCount` and a
`confirmationEvidencePath` such as
`usage/<project>/<job>/image-billing-confirmation.json`; when the user declines
or the confirmation cannot be persisted, the queued image job is cancelled
before generation. This closes the local product gap that prevented the app
from producing a valid DF-244 confirmation record, but it still requires one
packaged-app Codex image run to capture the actual persisted record and update
the Lane D evidence bundle.

2026-06-22 KST product update: the same pre-generation confirmation record is
now mirrored into the project artifact store at
`projects/<project>/usage/<project>/<job>/image-billing-confirmation.json`
before the Codex image session starts. If that evidence write fails, the queued
Codex image job is cancelled as `evidence_write_failed`, so the app cannot run a
live image generation whose usage summary claims confirmation without a matching
persisted JSON evidence file.

## Generate Stage Live Image Path

2026-06-21 KST product update: after the confirmation record is attached, the
production `codex` Generate-stage job now runs the live Codex image session
instead of the mock slide loop. Each successful slide records a stored artifact
path and the outer job publishes a `live_slide_images` partial result, so the
usage/progress surface can distinguish a real Codex image run from mock preview
generation.

DF-244 still requires packaged-app manual QA with real image usage payloads and
the persisted pre-generation confirmation JSON captured from the same run.
