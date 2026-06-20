# Live Interview Cutover

Date: 2026-06-20

Scope: DF-213 interview question and Interview Brief Live cutover contract.

## Local Contract

`src/lib/live-interview-cutover.ts` defines the local approval boundary for the interview stage before a Brief can feed Research:

- question artifacts must come from Codex provider provenance in `production` execution mode using authenticated `codex_session` auth
- Brief artifacts must come from a second authenticated Codex turn after user answers
- Brief artifacts must persist under a different artifact id than the question artifact; otherwise `brief_reused_question_artifact` blocks approval
- question/Brief artifact ids and turn ids are compared after trimming boundary whitespace, so padding cannot disguise reused question evidence; padded reuse blocks with `brief_reused_question_turn` and `brief_reused_question_artifact`
- question/Brief artifact ids, turn ids, and thread ids must already be canonical; ids that only become valid after trimming block with `noncanonical_interview_identity`
- question and user-answer input artifact ids supplied to the interview gate must also be canonical; padded input ids block with `noncanonical_interview_input_identity` before they can be normalized into follow-up or Brief lineage
- question artifacts must use `interview_questions@v1` or `interview_questions_desktop@v1`, and Brief artifacts must use `interview_brief@v1`; otherwise `interview_prompt_version_mismatch` blocks approval
- question provenance must cite the project or initial prompt input artifact id supplied as `questionInputArtifactId`; otherwise `question_missing_project_input` blocks approval
- Brief provenance must cite the question artifact id in `inputArtifactIds`; otherwise `brief_missing_question_input` blocks approval
- Brief provenance must cite the user answer bundle id in `inputArtifactIds`; otherwise `brief_missing_answer_input` blocks approval
- the user answer bundle id must be separate from the live question artifact id; otherwise `brief_reused_question_answer` blocks approval
- mock provider and fixture lineage are blocked through `mock_lineage_contamination` and `fixture_lineage_contamination`
- missing required answers return `follow_up_required` and schedule an `interview_follow_up@v1` live turn with both question and answer-bundle inputs
- every scheduled follow-up question must have nonblank question text; otherwise `invalid_follow_up_question` blocks the claim before a blank follow-up turn can count as live evidence
- provider failure recovery has `fixtureFallbackAllowed: false` and exposes only `retry_live_turn` or `manual_input`
- accepted structured App Server results can be converted into persisted live text artifact records plus an `INTERVIEW_APPROVAL_PENDING` project patch without using a fixture
- `runLiveInterviewProductionWorkflow` runs production App Server question and Brief jobs before handing accepted outputs to the persistence gate
- `ProductionWorkflowStage` now renders a production interview App Server workflow panel for the `interview` step, listing the required `questions` and `brief` turns and blocking launch when the desktop App Server bridge is missing
- `deckforge_codex_app_server_smoke`, `deckforge_codex_app_server_structured_turn`, `src/lib/desktop-app-server-bridge.ts`, and `src/lib/desktop-codex-app-server-production-job.ts` now provide the desktop commands/adapters needed to detect the App Server bridge, smoke-test it, and feed structured-turn notifications into the production Job Manager path
- `src/lib/desktop-live-interview-workflow.ts` and `src/lib/desktop-live-interview-jobs.ts` now build desktop interview question and Brief prompts, parse the structured `InterviewQuestionPlan` / `InterviewBrief` outputs, run the live `questions` turn through the Tauri bridge adapter, bind the question turn to the project id as `questionInputArtifactId`, return a persisted question artifact when user follow-up is still required, and continue to a second live `brief` turn once required answers are present.
- `src/lib/live-interview-answer-map.ts` converts an existing project draft Brief plus initial prompt into the answer map consumed by the desktop live interview launcher.
- `src/components/deck/ProductionTextWorkflowLauncher.tsx` now wires the ready production interview button to the desktop interview launcher, passes draft-Brief answers when present, stores the question artifact record when follow-up is still required, and applies the ready Brief patch together with the question and Brief live artifact records when both live turns complete.

## Verified Locally

- `src/lib/live-interview-cutover.test.ts` accepts separate live question/Brief turns with thread and turn provenance.
- `src/lib/live-interview-artifact-identity.test.ts` rejects Brief artifacts that reuse the question artifact id with `brief_reused_question_artifact`, rejects answer bundles that reuse the question artifact id with `brief_reused_question_answer`, blocks whitespace-padded reuse of both question artifact and turn ids, rejects non-canonical question/Brief artifact identities with `noncanonical_interview_identity`, and rejects padded answer bundle input ids with `noncanonical_interview_input_identity`.
- It blocks Brief acceptance when required fields are unanswered, returns a follow-up turn input bundle, and rejects Brief provenance that omits the user answer bundle.
- `src/lib/live-interview-follow-up-question.test.ts` rejects required follow-up evidence whose question text is blank, blocking `invalid_follow_up_question`.
- `src/lib/live-interview-question-input.test.ts` blocks question turns that omit the project/initial prompt artifact from `inputArtifactIds`.
- `src/lib/live-interview-cutover-prompt-version.test.ts` rejects Codex artifacts produced with non-interview prompt versions while allowing the desktop interview question prompt version.
- It blocks mock/fixture provenance, non-session Codex auth via `non_codex_session_auth`, and verifies no fixture fallback is offered after provider failure.
- `src/lib/live-text-artifact-persistence.test.ts` verifies accepted live question and Brief outputs preserve artifact ids, turn provenance, and non-fixture lineage when creating the project patch.
- `src/lib/live-text-production-workflow.test.ts` verifies production App Server interview jobs produce accepted outputs before the live Brief project patch is created.
- `src/lib/production-text-workflow-gate.test.ts` and `src/components/deck/ProductionTextWorkflowPanel.integration.test.tsx` verify the production app surface exposes the live interview workflow stages and the `app_server_bridge_missing` blocker instead of leaving the step as passive copy.
- `src/lib/desktop-app-server-bridge.test.ts`, `src/lib/desktop-codex-app-server-production-job.test.ts`, and `cargo test --manifest-path src-tauri/Cargo.toml codex_app_server` verify the desktop bridge smoke adapter, structured-turn adapter, production notification adapter, and Rust protocol command pieces.
- `src/lib/live-interview-answer-map.test.ts` verifies the production launcher answer handoff from a project draft Brief.
- `src/lib/desktop-live-interview-workflow.test.ts` verifies the app-level desktop interview launcher invokes a structured `questions` turn, returns a persisted question artifact when follow-up is required, invokes a second structured `brief` turn when answers are present, preserves question input lineage, and uses strict App Server response schemas for both stages.
- `src/lib/desktop-live-interview-artifact-patch.test.ts` verifies the ready interview UI patch preserves both question and Brief live artifact records instead of storing only the Brief data.

## Verified Live Recheck

Using the current authenticated `codex app-server --stdio` binary through a temporary runtime adapter on 2026-06-19, `runDesktopLiveInterviewProductionWorkflow` completed both live interview turns with user answers supplied:

- Workflow result: `ready`.
- Resulting project stage: `INTERVIEW_APPROVAL_PENDING`.
- Question artifact: `p_goal_live_interview_20260619_brief_questions_live`, thread `019edc17-adba-7101-8554-e4067aa84b62`, turn `019edc17-b011-74d2-ae54-49842b7abd9d`, hash `sha256:b97f92d0`, prompt version `interview_questions_desktop@v1`, duration 139,900 ms. The local gate now accepts this desktop interview question prompt version while rejecting non-interview prompts.
- Brief artifact: `p_goal_live_interview_20260619_brief_brief_live`, thread `019edc19-ce10-7c32-acbd-a3ec406e7d7b`, turn `019edc19-d06e-7793-9fbc-80ec053bb9fa`, hash `sha256:4dabd196`, prompt version `interview_brief@v1`, duration 173,967 ms.
- The Brief artifact cited `p_goal_live_interview_20260619_brief_questions_live` in `inputArtifactIds`, proving the required question-to-Brief lineage. Future packaged evidence must also cite the deterministic user answer bundle id now required by `brief_missing_answer_input`.

## Production App-Surface Recheck

On 2026-06-21 KST, the production build was served at `http://127.0.0.1:4173/` and the app surface was driven with Playwright through the production `ProductionWorkflowStage` interview route. A local bridge helper implemented the same Tauri command names, then forwarded `deckforge_codex_app_server_structured_turn` to the authenticated `codex app-server --stdio` runtime (`codex-cli 0.141.0`, ChatGPT login, App Server `0.141.0`).

- Project: `p_live_runtime_text_20260621`, route `/project/p_live_runtime_text_20260621/interview`.
- First UI click produced `follow_up_required` and persisted `interview_questions` record `p_live_runtime_text_20260621_questions_live`, thread `019ee651-ecb8-70b0-b7a7-db93d9807c67`, turn `019ee651-ef5c-74c0-8608-acc5a0b9db1a`, hash `sha256:915848c9`.
- After the project prompt was updated with the requested canonical interview fields, the same production UI button completed a new question turn and a Brief turn.
- Ready question record: `p_live_runtime_text_20260621_questions_live`, thread `019ee652-f5e8-7eb2-b61b-6eadaba4307e`, turn `019ee652-f878-73c3-ae5d-80a212086a04`, hash `sha256:29b8b76d`.
- Ready Brief record: `p_live_runtime_text_20260621_brief_live`, thread `019ee653-1eea-7e83-8a5c-5a0e786b8b4b`, turn `019ee653-2126-7b51-bc89-f0d16497dc2c`, hash `sha256:bd4566a1`.
- Helper summary for all three turns included `turn/completed`; protocol frame counts were 446, 307, and 263 respectively, with 40 stderr log lines each and no stdout protocol parse failure.
- The project reached `INTERVIEW_APPROVAL_PENDING`, and the visible app status was `Live interview brief is ready.`
- Screenshot: `docs/live-evidence/runtime-text-interview-live-ready-2026-06-21.png`.

This is production browser app-surface evidence, not packaged native Tauri evidence. DF-213 can move closer to Verified Live for the interview path, but a packaged app run and follow-up-answer bundle audit are still required before closing.

## Remaining Live Evidence

DF-213 is not Verified Live yet. The app now exposes the production interview workflow gate, has desktop App Server smoke plus structured-turn commands, the library-level desktop workflow has completed live `questions` and `brief` turns with persisted provenance, and the ready interview button can invoke that launcher. It still needs the production interview workflow to record the same path from the packaged app surface and store:

- live question artifact bundle
- question artifact input ids that cite the project or initial prompt input artifact
- canonical user answer bundle distinct from the live question artifact
- live follow-up turn evidence when required fields are missing
- live Interview Brief artifact bundle from the packaged app surface
- normalized-distinct thread id, turn id, prompt version, runtime, duration, and input artifact ids for each artifact

Until that evidence exists, DF-213 remains `Partial, external evidence required`.
