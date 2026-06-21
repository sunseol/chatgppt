# Live Interruption Matrix

Date: 2026-06-19

Ticket: DF-243

## Contract

The Live interruption matrix validates that provider interruptions do not corrupt project state or allow partial artifacts into approval/export.

Every scenario must appear exactly once, the matrix must not contain unknown scenario rows, each scenario must carry a distinct non-synthetic live job id plus a distinct persisted recovery snapshot path, and the matrix itself must be documented by a non-synthetic, non-developer-local `docs/live-interruption-matrix.md` report path. Job ids, snapshots, or report paths marked as `mock`, `fixture`, `test`, or `fake` are not accepted as Live interruption evidence, and local absolute or `file://` paths are rejected. Live job ids, recovery snapshot paths, cancel-signal ids/paths, and approval/export gate evidence paths must already be canonical rather than only becoming valid after trim normalization. Recovery, cancel-signal, approval-gate, and export-gate evidence paths marked as template, sample, example, or placeholder bundles are also rejected before they can count as observed interruption evidence. An accepted recovery snapshot path must identify the scenario it proves, so `image_partial_resume` cannot be satisfied by a `text-turn-shutdown.json` snapshot. Reusing one live job id or recovery snapshot path across multiple required scenarios is blocked because it can hide a missing text, fetch, image, cancellation, or approval/export run. Recovered job states are validated at runtime against the allowed taxonomy: queued, running, succeeded, failed, cancelled, and interrupted. The cancellation scenario must record both an app-storage recovery snapshot and a persisted cancel signal JSON path that targets the same live job id; a `cancellationRecorded` boolean alone is not enough Live evidence. The interrupted artifact gate scenario must explicitly exercise both approval and export gates, with distinct persisted approval/export gate JSON paths, even when no interrupted artifact becomes approvable or exportable. The closure manifest may reference app-captured artifacts only after they are copied into a committed `docs/live-evidence/...` bundle; generic `recovery/*.json` paths are not enough for issue closure.

Required scenarios:

- `text_turn_shutdown`: app exits during a live Codex text turn and recovers to interrupted, failed, or cancelled.
- `fetch_shutdown`: app exits during live source fetch and recovers to interrupted, failed, or cancelled.
- `image_partial_resume`: completed image artifacts remain complete and resume retries only nonblank, non-duplicated unfinished images listed in the pending set.
- `cancel_job`: cancellation does not leave a background job running.
- `interrupted_artifact_gate`: interrupted artifacts cannot be approved or exported.

## Blocking Rules

`src/lib/live-interruption-matrix.ts` returns these issue codes:

- `missing_interruption_scenario`: a required matrix scenario is absent.
- `duplicate_interruption_scenario`: a matrix scenario appears more than once.
- `unknown_interruption_scenario`: the matrix contains a row outside the five DF-243 scenarios.
- `missing_live_job_evidence`: a scenario lacks a non-synthetic live job id.
- `duplicate_interruption_live_job`: multiple required scenarios reuse one live job id.
- `duplicate_recovery_snapshot`: multiple required scenarios reuse one recovery snapshot path.
- `invalid_recovered_job_state`: recovered job status evidence is outside the DF-243 state taxonomy.
- `missing_recovery_snapshot`: a scenario lacks a persisted, non-synthetic, non-template, non-developer-local recovery snapshot.
- `missing_app_cancel_snapshot`: cancellation evidence lacks an app-storage recovery snapshot.
- `missing_cancel_signal_evidence`: cancellation evidence lacks a persisted, non-synthetic, non-developer-local cancel signal JSON path.
- `cancel_signal_job_mismatch`: cancel signal evidence targets a different or missing live job id.
- `noncanonical_interruption_evidence_identity`: durable live job ids or evidence paths only become valid after trim normalization.
- `interruption_evidence_path_scenario_mismatch`: a persisted recovery snapshot path does not identify the scenario it is used to prove.
- `unsafe_recovered_job_state`: interrupted text/fetch job recovered as queued, running, or succeeded.
- `completed_artifact_lost`: an artifact completed before interruption is missing after recovery.
- `unsafe_partial_image_resume`: image resume uses blank or duplicated image artifact ids, retries a completed artifact, skips a pending artifact, or resumes an image artifact that was not pending.
- `cancelled_job_still_running`: cancelled job still appears to run in the background.
- `cancelled_job_completed_after_cancel`: cancelled job produced new completed artifacts or recovered as succeeded after cancellation.
- `missing_interrupted_approval_gate_evidence`: interrupted artifact evidence did not exercise the approval gate with a persisted JSON evidence path.
- `missing_interrupted_export_gate_evidence`: interrupted artifact evidence did not exercise the export gate with a persisted JSON evidence path.
- `duplicate_interrupted_gate_evidence`: interrupted artifact approval and export gate checks reuse one JSON evidence path.
- `interrupted_artifact_approvable`: interrupted artifact is approvable or exportable.
- `missing_interruption_report`: `docs/live-interruption-matrix.md` evidence path is missing, synthetic, or developer-local.

`src/lib/live-interruption-closure-evidence.ts` additionally returns `interruption_closure_artifact_outside_evidence_bundle` when a closure manifest points at generic recovery JSON paths instead of committed `docs/live-evidence/...` bundle artifacts.

## Local Evidence

- `src/lib/live-interruption-matrix.test.ts`, `src/lib/live-interruption-scenario-uniqueness.test.ts`, `src/lib/live-interruption-scenario-evidence-path.test.ts`, `src/lib/live-interruption-template-evidence.test.ts`, `src/lib/live-interruption-image-resume.test.ts`, `src/lib/live-interruption-image-artifact-identity.test.ts`, `src/lib/live-interruption-evidence-identity.test.ts`, `src/lib/live-interruption-state-taxonomy.test.ts`, `src/lib/live-interruption-gate-evidence-uniqueness.test.ts`, and `src/lib/live-interruption-report-path.test.ts` verify safe recovery, recovered job state taxonomy, summary formatting, exact scenario coverage with no unknown scenario rows, scenario-identifying recovery snapshot paths, distinct canonical live job/snapshot/app-storage cancel snapshot/cancel signal path and job-id matching requirements, distinct persisted interrupted approval/export gate JSON paths, fixture/test/fake/template interruption evidence rejection, synthetic and developer-local matrix report/evidence path rejection, unsafe restart/resume/cancel/approval/export blockers, blank/duplicate/untracked image resume rejection, and cancellation attempts that still complete artifacts after cancellation.
- `src/lib/provider-job-recovery.ts` preserves job snapshots for restart recovery.
- `src/lib/slide-generation-queue-live-controls.test.ts` already covers retry, partial image resume, and cancellation behavior at the queue level.
- `src/lib/live-interruption-closure-evidence.ts` validates the DF-243 closure manifest that ties `#153`, `DF-243`, `docs/live-interruption-matrix.md`, the matrix JSON bundle, and the required image partial-resume, app cancel snapshot, cancel signal, approval-gate, and export-gate JSON artifacts back to the same evaluated matrix scenarios, and requires closure artifacts to live under committed `docs/live-evidence/...` bundle paths.
- `src/lib/live-interruption-closure-evidence.test.ts` verifies that closure remains blocked when those required artifacts are missing, drift from the matrix, or point at generic recovery-local JSON paths outside the evidence bundle.

## Live Text Turn Interrupt Evidence

Using `codex-cli 0.141.0` and App Server `0.141.0` on 2026-06-19 KST, a direct JSON-RPC probe started a long authenticated text turn and immediately sent `turn/interrupt` after `turn/started`.

- Thread: `019edc5a-0a48-7ec2-aa86-c539ed9546b1`
- Interrupted turn: `019edc5a-0cc0-7031-915a-5fc6d65c6d86`
- Duration: 927 ms
- Observed methods: `remoteControl/status/changed`, `thread/started`, `warning`, `mcpServer/startupStatus/updated`, `thread/status/changed`, `turn/started`, `turn/completed`
- `turn/completed` status: `interrupted`
- `thread/read` status for the turn: `interrupted`
- `thread/turns/list` status for the turn: `interrupted`
- Evidence digest over the read/list summaries and observed method list: `27855e9afff031bc49c87bb08bb46ea6ac9a5436e4a2eef9ecb74382e62809b6`

This proves the current App Server can persist an interrupted live text turn without accepting a completed artifact.

## Live Source Fetch Abort Evidence

Using the production `fetchResearchSource` path on 2026-06-19 KST, a live HTTPS GET to `https://httpbin.org/delay/10` was started with an `AbortController` and aborted after 754 ms.

- Fetch id: `fetch_shutdown_live_20260619`
- Result status: `failed`
- Retryable: `true`
- Error: `The operation was aborted.`
- Raw content persisted: no
- Content hash persisted: no
- Evidence digest over the result object: `a472a031283e5a2ce537801d43a15b2d121241d823397868b81437c50e78bc3d`

This proves an interrupted live source fetch returns a retryable failed state without creating a completed source artifact.

## Live Cancel No-Background-Completion Evidence

Using `codex-cli 0.141.0` and App Server `0.141.0` on 2026-06-19 KST, a second long live text turn was interrupted and then observed for another 3,009 ms after `turn/completed`.

- Thread: `019edc60-600b-78d3-9e6f-2c0ca3b99061`
- Interrupted turn: `019edc60-6250-7ba1-bdc4-86c28083c19d`
- `turn/completed` status: `interrupted`
- `thread/read` status for the turn: `interrupted`
- `thread/turns/list` status for the turn: `interrupted`
- Late `item/completed` notifications for the interrupted turn: 0
- Evidence digest over the no-background-completion observation: `f35c082c75b37ccbe7e8e5eddf1907e61e66171e13d94dd2c4df50fe3060b62f`

This proves the current App Server interrupt path does not produce a delayed completed item after cancellation.

## Remaining Live Evidence

The local contract is ready and live text-turn, source-fetch interruption, and App Server no-background-completion behavior have been verified, but DF-243 still requires the rest of the live interruption test matrix against live image partial resume, app-level persisted cancel-signal snapshots that target the same live job id, and interrupted artifact approval/export before the issue can close.

## 2026-06-21 Runtime/Text Lane Status

The production app-surface text recheck did not reach Plan/Design/Layout jobs because approved Research evidence is missing. Runtime/Text can still report the existing direct live text-turn interruption evidence above, but DF-243 remains blocked on app-level persisted cancellation snapshots, interrupted approval/export gate evidence, and image partial-resume evidence from the image lane. No new app-level interruption matrix scenario was closed by the 2026-06-21 Runtime/Text run.

## 2026-06-21 Lane F Recheck

Lane F did not produce new live interruption matrix artifacts. The package and local test gates pass, but no packaged app-level persisted recovery snapshot set, cancel-signal JSON targeting the same live job id, image partial-resume evidence, or interrupted approval/export gate JSON evidence was generated.

DF-243 remains open. Next evidence needed: the full five-scenario live matrix with distinct live job ids, distinct persisted recovery snapshots, app-storage cancel snapshot plus cancel signal, image partial-resume proof, and distinct interrupted approval/export gate evidence paths.

## Closure Manifest Handoff

2026-06-21 KST product update: DF-243 now has a machine-checkable closure
manifest shape in `src/lib/live-interruption-closure-evidence.ts`. The current
handoff manifest is stored at
`docs/live-evidence/lane-h-20260621/df243-closure-evidence.json` with status
`blocked`. It records the direct text-turn and fetch-abort observations that
exist today, but leaves the required closure artifact paths empty for image
partial resume, app-storage cancel snapshot, cancel-signal JSON, approval-gate
JSON, and export-gate JSON.

This does not close DF-243. It gives the packaged QA lane one canonical JSON
shape to fill, and the validator rejects the manifest until those paths are
persisted, copied into `docs/live-evidence/...`, and match the corresponding
matrix scenario evidence.
