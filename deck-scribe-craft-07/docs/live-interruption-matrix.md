# Live Interruption Matrix

Date: 2026-06-18

Ticket: DF-243

## Contract

The Live interruption matrix validates that provider interruptions do not corrupt project state or allow partial artifacts into approval/export.

Every scenario must carry a non-mock live job id plus a persisted recovery snapshot path. The cancellation scenario must also record persisted cancel signal evidence.

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
- `missing_cancel_signal_evidence`: cancellation evidence lacks a persisted cancel signal.
- `unsafe_recovered_job_state`: interrupted text/fetch job recovered as queued, running, or succeeded.
- `completed_artifact_lost`: an artifact completed before interruption is missing after recovery.
- `unsafe_partial_image_resume`: image resume retries a completed artifact or skips a pending artifact.
- `cancelled_job_still_running`: cancelled job still appears to run in the background.
- `cancelled_job_completed_after_cancel`: cancelled job produced new completed artifacts or recovered as succeeded after cancellation.
- `interrupted_artifact_approvable`: interrupted artifact is approvable or exportable.
- `missing_interruption_report`: `docs/live-interruption-matrix.md` evidence path is missing.

## Local Evidence

- `src/lib/live-interruption-matrix.test.ts` verifies safe recovery, summary formatting, live job/snapshot/cancel signal evidence requirements, unsafe restart/resume/cancel/approval blockers, and cancellation attempts that still complete artifacts after cancellation.
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

## Remaining Live Evidence

The local contract is ready and live text-turn interruption has been verified, but DF-243 still requires the rest of the live interruption test matrix against live fetches, live image partial resume, persisted cancel-signal behavior, and interrupted artifact approval/export before the issue can close.
