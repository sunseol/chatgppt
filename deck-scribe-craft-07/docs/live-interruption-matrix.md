# Live Interruption Matrix

Date: 2026-06-19

Ticket: DF-243

## Contract

The Live interruption matrix validates that provider interruptions do not corrupt project state or allow partial artifacts into approval/export.

Every scenario must carry a non-mock live job id plus a persisted recovery snapshot path. The cancellation scenario must record persisted cancel signal evidence and an app-storage recovery snapshot. The interrupted artifact gate scenario must explicitly exercise both approval and export gates, even when no interrupted artifact becomes approvable or exportable.

Required scenarios:

- `text_turn_shutdown`: app exits during a live Codex text turn and recovers to interrupted, failed, or cancelled.
- `fetch_shutdown`: app exits during live source fetch and recovers to interrupted, failed, or cancelled.
- `image_partial_resume`: completed image artifacts remain complete and resume retries only unfinished images.
- `cancel_job`: cancellation does not leave a background job running.
- `interrupted_artifact_gate`: interrupted artifacts cannot be approved or exported.

## Blocking Rules

`src/lib/live-interruption-matrix.ts` returns these issue codes:

- `missing_interruption_scenario`: a required matrix scenario is absent.
- `missing_live_job_evidence`: a scenario lacks a non-mock live job id.
- `missing_recovery_snapshot`: a scenario lacks a persisted recovery snapshot.
- `missing_app_cancel_snapshot`: cancellation evidence lacks an app-storage recovery snapshot.
- `missing_cancel_signal_evidence`: cancellation evidence lacks a persisted cancel signal.
- `unsafe_recovered_job_state`: interrupted text/fetch job recovered as queued, running, or succeeded.
- `completed_artifact_lost`: an artifact completed before interruption is missing after recovery.
- `unsafe_partial_image_resume`: image resume retries a completed artifact or skips a pending artifact.
- `cancelled_job_still_running`: cancelled job still appears to run in the background.
- `cancelled_job_completed_after_cancel`: cancelled job produced new completed artifacts or recovered as succeeded after cancellation.
- `missing_interrupted_approval_gate_evidence`: interrupted artifact evidence did not exercise the approval gate.
- `missing_interrupted_export_gate_evidence`: interrupted artifact evidence did not exercise the export gate.
- `interrupted_artifact_approvable`: interrupted artifact is approvable or exportable.
- `missing_interruption_report`: `docs/live-interruption-matrix.md` evidence path is missing.

## Local Evidence

- `src/lib/live-interruption-matrix.test.ts` verifies safe recovery, summary formatting, live job/snapshot/app-storage cancel snapshot/cancel signal evidence requirements, unsafe restart/resume/cancel/approval/export blockers, and cancellation attempts that still complete artifacts after cancellation.
- `src/lib/provider-job-recovery.ts` preserves job snapshots for restart recovery.
- `src/lib/slide-generation-queue-live-controls.test.ts` already covers retry, partial image resume, and cancellation behavior at the queue level.

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

The local contract is ready and live text-turn, source-fetch interruption, and App Server no-background-completion behavior have been verified, but DF-243 still requires the rest of the live interruption test matrix against live image partial resume, app-level persisted cancel-signal snapshots, and interrupted artifact approval/export before the issue can close.
