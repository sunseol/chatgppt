# Live Project Thread Lifecycle

Date: 2026-06-19

Scope: DF-212 Project Thread and Context lifecycle.

## Local Contract

`src/lib/project-thread-lifecycle.ts` keeps project thread recovery bound to the approved deck context:

- a project has one coordinator thread id and stage-specific worker thread ids
- every worker carries the same `deckContextId`, `deckContextHash`, approved artifact id bundle, and `lastCompletedTurnId` as the coordinator manifest
- restart recovery returns resumable worker threads only when the persisted manifest still matches the current frozen deck context and retained worker turn lineage
- active live jobs are marked stale when upstream approval invalidates their deck context

`src/lib/project-thread-resume-evidence.ts` now validates the live resume evidence required before DF-212 can be counted as live:

- the resumed App Server thread id must be one of the recovered worker thread ids
- the evidence deck context id, context hash, and approved artifact ids must match the current frozen deck context
- the resumed turn must complete
- the resumed turn must be live Codex production evidence using the authenticated Codex session
- the evidence `previousTurnId` must match the recovered worker thread's persisted `lastCompletedTurnId`; mismatches block with `resume_previous_turn_not_recovered`
- the resumed turn must be a new turn, not the pre-restart turn id
- the evidence must be collected after recreating the App Server process

## Verified Locally

- `src/lib/project-thread-lifecycle.test.ts` verifies manifest creation, worker context drift rejection, restart recovery, changed-context blockers, last-turn recovery, and stale live-job detection.
- `src/lib/project-thread-resume-evidence.test.ts` verifies the DF-212 resume evidence gate accepts a completed post-restart App Server turn and rejects stale context, incomplete turns, unknown threads, reused turns, non-restart evidence, and non-live resumed worker turns such as `resume_non_codex_turn`.
- `src/lib/project-thread-resume-lineage.test.ts` verifies the gate rejects a claimed previous turn that does not match the recovered worker thread's last completed turn.

## Verified Live Recheck

Using the current authenticated `codex app-server --stdio` binary and the generated `ThreadResumeParams` schema on 2026-06-19:

- A first App Server process started worker thread `019edc28-bf27-7380-b7d2-65405e6c6758`.
- The first context turn completed as `019edc28-c179-7453-a5a5-c87e29096422`.
- The temporary worker manifest persisted project `project_df212_live_resume`, deck context `deckctx_df212_live_resume`, context hash `sha256:context_df212_live_resume`, approved artifacts `brief_df212_live`, `research_df212_live`, `plan_df212_live`, `design_df212_live`, and `layout_df212_live`, and worker `lastCompletedTurnId` `019edc28-c179-7453-a5a5-c87e29096422`.
- The first App Server process was terminated.
- A second App Server process called `thread/resume` for the same worker thread id.
- The resumed post-restart turn completed as `019edc28-f9ec-72e1-9695-1a9a2c2ca61d`.
- The first turn output hash was `119e2ab775846cfd0f60fbd366c0217aa8a01e05d2df57eb0243435b8bf4d61f`.
- The resumed turn output hash was `2b21fcbd956c896c0e115bea4b2320a93571c4f3453d3da51786da0c9a76d870`.
- `evaluateProjectThreadResumeEvidence` returned `ready` for the recovered plan worker thread because the evidence previous turn matched the recovered worker `lastCompletedTurnId` and the resumed turn id was new.

Observed first-process event methods included `thread/started`, `turn/started`, `item/completed`, `item/agentMessage/delta`, `thread/tokenUsage/updated`, `account/rateLimits/updated`, and `turn/completed`.

Observed second-process event methods included `thread/status/changed`, `thread/tokenUsage/updated`, `thread/goal/cleared`, `turn/started`, `item/completed`, `item/agentMessage/delta`, `account/rateLimits/updated`, and `turn/completed`.

## Remaining Live Evidence

DF-212 is still not fully Verified Live. The library-level protocol recheck proves App Server can resume a recovered project worker thread after the App Server process is recreated, and the local evidence gate now rejects stale, fake, or turn-lineage-mismatched resume evidence. The remaining gap is a packaged desktop restart/reopen run that persists the manifest through the app storage boundary and then invokes the resumed worker thread from the production UI.
