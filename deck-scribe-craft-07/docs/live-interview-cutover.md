# Live Interview Cutover

Date: 2026-06-19

Scope: DF-213 interview question and Interview Brief Live cutover contract.

## Local Contract

`src/lib/live-interview-cutover.ts` defines the local approval boundary for the interview stage before a Brief can feed Research:

- question artifacts must come from Codex provider provenance in `production` execution mode
- Brief artifacts must come from a second Codex turn after user answers
- Brief provenance must cite the question artifact id in `inputArtifactIds`; otherwise `brief_missing_question_input` blocks approval
- mock provider and fixture lineage are blocked through `mock_lineage_contamination` and `fixture_lineage_contamination`
- missing required answers return `follow_up_required` and schedule an `interview_follow_up@v1` live turn
- provider failure recovery has `fixtureFallbackAllowed: false` and exposes only `retry_live_turn` or `manual_input`
- accepted structured App Server results can be converted into persisted live text artifact records plus an `INTERVIEW_APPROVAL_PENDING` project patch without using a fixture
- `runLiveInterviewProductionWorkflow` runs production App Server question and Brief jobs before handing accepted outputs to the persistence gate
- `ProductionWorkflowStage` now renders a production interview App Server workflow panel for the `interview` step, listing the required `questions` and `brief` turns and blocking launch when the desktop App Server bridge is missing
- `deckforge_codex_app_server_smoke`, `deckforge_codex_app_server_structured_turn`, `src/lib/desktop-app-server-bridge.ts`, and `src/lib/desktop-codex-app-server-production-job.ts` now provide the desktop commands/adapters needed to detect the App Server bridge, smoke-test it, and feed structured-turn notifications into the production Job Manager path
- `src/lib/desktop-live-interview-workflow.ts` and `src/lib/desktop-live-interview-jobs.ts` now build the desktop interview question prompt, parse the structured `InterviewQuestionPlan`, run the live `questions` turn through the Tauri bridge adapter, and create a persisted live question artifact when user follow-up is still required.
- `src/components/deck/ProductionTextWorkflowLauncher.tsx` now wires the ready production interview button to that desktop `questions` launcher and stores the question artifact record on the project.

## Verified Locally

- `src/lib/live-interview-cutover.test.ts` accepts separate live question/Brief turns with thread and turn provenance.
- It blocks Brief acceptance when required fields are unanswered and returns a follow-up turn input bundle.
- It blocks mock/fixture provenance and verifies no fixture fallback is offered after provider failure.
- `src/lib/live-text-artifact-persistence.test.ts` verifies accepted live question and Brief outputs preserve artifact ids, turn provenance, and non-fixture lineage when creating the project patch.
- `src/lib/live-text-production-workflow.test.ts` verifies production App Server interview jobs produce accepted outputs before the live Brief project patch is created.
- `src/lib/production-text-workflow-gate.test.ts` and `src/components/deck/ProductionTextWorkflowPanel.integration.test.tsx` verify the production app surface exposes the live interview workflow stages and the `app_server_bridge_missing` blocker instead of leaving the step as passive copy.
- `src/lib/desktop-app-server-bridge.test.ts`, `src/lib/desktop-codex-app-server-production-job.test.ts`, and `cargo test --manifest-path src-tauri/Cargo.toml codex_app_server` verify the desktop bridge smoke adapter, structured-turn adapter, production notification adapter, and Rust protocol command pieces.
- `src/lib/desktop-live-interview-workflow.test.ts` verifies the app-level desktop interview launcher invokes a structured `questions` turn, returns a persisted question artifact, and preserves that artifact in a project patch.

## Remaining Live Evidence

DF-213 is not Verified Live yet. The app now exposes the production interview workflow gate, has desktop App Server smoke plus structured-turn commands, and the ready interview button can invoke a live `questions` turn through the desktop launcher. It still needs the production interview workflow to record authenticated follow-up and Brief turns from the packaged app surface and store:

- live question artifact bundle
- user answer bundle
- live follow-up turn when required fields are missing
- live Interview Brief artifact bundle
- thread id, turn id, prompt version, runtime, duration, and input artifact ids for each artifact

Until that evidence exists, DF-213 remains `Partial, external evidence required`.
