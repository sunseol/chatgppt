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

## Remaining Live Evidence

The local contract is ready, but DF-243 still requires a real live interruption test matrix against authenticated text turns, live fetches, and live image jobs before the issue can close.
