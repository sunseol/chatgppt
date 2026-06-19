# Live Interview Cutover

Date: 2026-06-19

Scope: DF-213 interview question and Interview Brief Live cutover contract.

## Local Contract

`src/lib/live-interview-cutover.ts` defines the local approval boundary for the interview stage before a Brief can feed Research:

- question artifacts must come from Codex provider provenance in `production` execution mode using authenticated `codex_session` auth
- Brief artifacts must come from a second authenticated Codex turn after user answers
- Brief provenance must cite the question artifact id in `inputArtifactIds`; otherwise `brief_missing_question_input` blocks approval
- mock provider and fixture lineage are blocked through `mock_lineage_contamination` and `fixture_lineage_contamination`
- missing required answers return `follow_up_required` and schedule an `interview_follow_up@v1` live turn
- provider failure recovery has `fixtureFallbackAllowed: false` and exposes only `retry_live_turn` or `manual_input`
- accepted structured App Server results can be converted into persisted live text artifact records plus an `INTERVIEW_APPROVAL_PENDING` project patch without using a fixture
- `runLiveInterviewProductionWorkflow` runs production App Server question and Brief jobs before handing accepted outputs to the persistence gate
- `ProductionWorkflowStage` now renders a production interview App Server workflow panel for the `interview` step, listing the required `questions` and `brief` turns and blocking launch when the desktop App Server bridge is missing
- `deckforge_codex_app_server_smoke`, `deckforge_codex_app_server_structured_turn`, `src/lib/desktop-app-server-bridge.ts`, and `src/lib/desktop-codex-app-server-production-job.ts` now provide the desktop commands/adapters needed to detect the App Server bridge, smoke-test it, and feed structured-turn notifications into the production Job Manager path
- `src/lib/desktop-live-interview-workflow.ts` and `src/lib/desktop-live-interview-jobs.ts` now build desktop interview question and Brief prompts, parse the structured `InterviewQuestionPlan` / `InterviewBrief` outputs, run the live `questions` turn through the Tauri bridge adapter, return a persisted question artifact when user follow-up is still required, and continue to a second live `brief` turn once required answers are present.
- `src/lib/live-interview-answer-map.ts` converts an existing project draft Brief plus initial prompt into the answer map consumed by the desktop live interview launcher.
- `src/components/deck/ProductionTextWorkflowLauncher.tsx` now wires the ready production interview button to the desktop interview launcher, passes draft-Brief answers when present, stores the question artifact record when follow-up is still required, and can apply the ready Brief patch when both live turns complete.

## Verified Locally

- `src/lib/live-interview-cutover.test.ts` accepts separate live question/Brief turns with thread and turn provenance.
- It blocks Brief acceptance when required fields are unanswered and returns a follow-up turn input bundle.
- It blocks mock/fixture provenance, non-session Codex auth via `non_codex_session_auth`, and verifies no fixture fallback is offered after provider failure.
- `src/lib/live-text-artifact-persistence.test.ts` verifies accepted live question and Brief outputs preserve artifact ids, turn provenance, and non-fixture lineage when creating the project patch.
- `src/lib/live-text-production-workflow.test.ts` verifies production App Server interview jobs produce accepted outputs before the live Brief project patch is created.
- `src/lib/production-text-workflow-gate.test.ts` and `src/components/deck/ProductionTextWorkflowPanel.integration.test.tsx` verify the production app surface exposes the live interview workflow stages and the `app_server_bridge_missing` blocker instead of leaving the step as passive copy.
- `src/lib/desktop-app-server-bridge.test.ts`, `src/lib/desktop-codex-app-server-production-job.test.ts`, and `cargo test --manifest-path src-tauri/Cargo.toml codex_app_server` verify the desktop bridge smoke adapter, structured-turn adapter, production notification adapter, and Rust protocol command pieces.
- `src/lib/live-interview-answer-map.test.ts` verifies the production launcher answer handoff from a project draft Brief.
- `src/lib/desktop-live-interview-workflow.test.ts` verifies the app-level desktop interview launcher invokes a structured `questions` turn, returns a persisted question artifact when follow-up is required, invokes a second structured `brief` turn when answers are present, preserves question input lineage, and uses strict App Server response schemas for both stages.

## Verified Live Recheck

Using the current authenticated `codex app-server --stdio` binary through a temporary runtime adapter on 2026-06-19, `runDesktopLiveInterviewProductionWorkflow` completed both live interview turns with user answers supplied:

- Workflow result: `ready`.
- Resulting project stage: `INTERVIEW_APPROVAL_PENDING`.
- Question artifact: `p_goal_live_interview_20260619_brief_questions_live`, thread `019edc17-adba-7101-8554-e4067aa84b62`, turn `019edc17-b011-74d2-ae54-49842b7abd9d`, hash `sha256:b97f92d0`, prompt version `interview_questions_desktop@v1`, duration 139,900 ms.
- Brief artifact: `p_goal_live_interview_20260619_brief_brief_live`, thread `019edc19-ce10-7c32-acbd-a3ec406e7d7b`, turn `019edc19-d06e-7793-9fbc-80ec053bb9fa`, hash `sha256:4dabd196`, prompt version `interview_brief@v1`, duration 173,967 ms.
- The Brief artifact cited `p_goal_live_interview_20260619_brief_questions_live` in `inputArtifactIds`, proving the required question-to-Brief lineage.

## Remaining Live Evidence

DF-213 is not Verified Live yet. The app now exposes the production interview workflow gate, has desktop App Server smoke plus structured-turn commands, the library-level desktop workflow has completed live `questions` and `brief` turns with persisted provenance, and the ready interview button can invoke that launcher. It still needs the production interview workflow to record the same path from the packaged app surface and store:

- live question artifact bundle
- user answer bundle
- live follow-up turn evidence when required fields are missing
- live Interview Brief artifact bundle from the packaged app surface
- thread id, turn id, prompt version, runtime, duration, and input artifact ids for each artifact

Until that evidence exists, DF-213 remains `Partial, external evidence required`.
