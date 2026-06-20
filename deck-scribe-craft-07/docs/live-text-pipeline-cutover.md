# Live Text Pipeline Cutover

Date: 2026-06-20

Scope: DF-214 Deck Plan, Design System, and Layout IR Live cutover contract.

## Local Contract

`src/lib/live-text-pipeline-cutover.ts` defines the approval boundary for the three post-interview text artifacts:

- Deck Plan, Design System, and Layout IR must each come from separate production Codex turns using authenticated `codex_session` auth.
- Deck Plan, Design System, and Layout IR turn ids are compared after trimming boundary whitespace; padded reuse blocks with `shared_live_turn`.
- Deck Plan, Design System, and Layout IR must also persist as separate artifact ids; normalized duplicate Plan/Design/Layout artifact ids block with `shared_live_artifact`.
- Every artifact must carry complete provider provenance with thread id, turn id, runtime, prompt version, duration, and input artifact ids.
- Stage prompt lineage must match the artifact: Deck Plan uses `deck_plan@v1` or `deck_plan_desktop@v1`, Design System uses `design_system@v1` or `design_system_desktop@v1`, and Layout IR uses `layout_ir@v1` or `layout_ir_desktop@v1`; otherwise `text_pipeline_prompt_version_mismatch` blocks approval.
- Deck Plan provenance must cite distinct approved Brief and Live Research Pack artifact ids; reused upstream ids block with `shared_brief_research_input`, and omitted ids block with `missing_brief_input` or `missing_research_input`.
- Design System provenance must cite the live Deck Plan artifact, with input ids compared after trimming boundary whitespace.
- Layout IR provenance must cite both the live Deck Plan and live Design System artifacts, also using normalized input-id comparisons.
- Deck Plan markdown must parse through the existing slide spec parser.
- Design System JSON must pass `DesignSystemSchema`.
- Layout IR JSON must pass `LayoutIRSchema`, which restricts components to the approved component catalog.
- Five-slide outputs must share one `deckContextId` and one `designSystemId`.
- Schema failures return a live repair turn up to two attempts; counted repair evidence must carry fresh, nonblank repair turn ids that do not reuse the failed output turn, otherwise `invalid_repair_turn_evidence` blocks approval before `schema_repair_exhausted`.
- Provider failure recovery has `fixtureFallbackAllowed: false` and exposes only `retry_live_turn` or `manual_input`.
- accepted structured App Server results can be converted into persisted Plan, Design System, and Layout IR artifact records plus a `LAYOUT_APPROVAL_PENDING` project patch only after the cutover gate is ready.
- `runLiveTextPipelineProductionWorkflow` runs the production App Server Deck Plan, Design System, and Layout IR jobs before handing accepted outputs to the persistence gate.
- `ProductionWorkflowStage` now renders a production Plan/Design/Layout App Server workflow panel for the `plan`, `design`, and `layout` steps, listing the required `deck_plan`, `design_system`, and `layout_ir` turns, blocking missing approved Brief/Research prerequisites, and blocking launch when the desktop App Server bridge is missing.
- `deckforge_codex_app_server_smoke`, `deckforge_codex_app_server_structured_turn`, `src/lib/desktop-app-server-bridge.ts`, and `src/lib/desktop-codex-app-server-production-job.ts` now provide the desktop commands/adapters needed to detect the App Server bridge, smoke-test it, and feed structured-turn notifications into the production Job Manager path.
- `src/lib/desktop-live-text-pipeline-workflow.ts` and `src/lib/desktop-live-text-pipeline-jobs.ts` now build the desktop Plan/Design/Layout prompts, parse desktop structured-turn outputs through the same schema gates, run all three turns through the Tauri bridge adapter, and hand accepted outputs to the live text persistence gate.
- `src/components/deck/ProductionTextWorkflowLauncher.tsx` wires the ready production text-pipeline button to that desktop launcher and stores the ready `plan`, `design`, and `layout` project patch plus the `deck_plan`, `design_system`, and `layout_ir` live artifact records when all three live turns are accepted.

## Verified Locally

- `src/lib/live-text-pipeline-cutover.test.ts` accepts a five-slide live bundle with separate plan/design/layout turn provenance.
- `src/lib/live-text-pipeline-artifact-identity.test.ts` rejects Design/System or Layout evidence that reuses an earlier text artifact or turn id with whitespace padding, and rejects reused approved Brief/Research handoff ids with `shared_brief_research_input`.
- `src/lib/live-text-pipeline-auth.test.ts` accepts the desktop text-pipeline prompt versions, rejects stage-wrong prompt lineage with `text_pipeline_prompt_version_mismatch`, rejects Deck Plan turns that omit the approved Research Pack input with `missing_research_input`, and rejects reused Plan/Design/Layout artifact ids with `shared_live_artifact`.
- It schedules a repair turn for invalid Layout IR schema output, rejects repair evidence that lacks a fresh repair turn id, and blocks after two failed repair attempts.
- It blocks mock/fixture provenance and non-session Codex auth with no fixture fallback.
- It blocks slide refs that drift from the shared deck context or design system.
- `src/lib/live-text-artifact-persistence.test.ts` verifies accepted App Server outputs persist live artifact ids/provenance, render Layout IR into a project layout prototype, and return a live repair turn instead of storing invalid plan output.
- `src/lib/live-text-production-workflow.test.ts` verifies production App Server jobs are run before persistence and that a failed structured job stops before artifact persistence.
- `src/lib/production-text-workflow-gate.test.ts` and `src/components/deck/ProductionTextWorkflowPanel.integration.test.tsx` verify the production app surface exposes the text-pipeline workflow stages, upstream prerequisite blockers, bridge blocker, and ready patch targets when prerequisites plus bridge availability are present.
- `src/lib/desktop-app-server-bridge.test.ts`, `src/lib/desktop-codex-app-server-production-job.test.ts`, and `cargo test --manifest-path src-tauri/Cargo.toml codex_app_server` verify the desktop bridge smoke adapter, structured-turn adapter, production notification adapter, and Rust protocol command pieces.
- `src/lib/desktop-live-text-pipeline-workflow.test.ts` verifies the app-level desktop launcher invokes three structured turns before persisting a ready Plan/Design/Layout bundle and blocks before invoking turns when the approved Brief/Research prerequisites are missing.
- `src/lib/desktop-live-text-pipeline-artifact-patch.test.ts` verifies the ready UI patch preserves existing live artifact records and appends the accepted Plan, Design System, and Layout IR artifact records.

## Remaining Live Evidence

DF-214 is not Verified Live yet. The app now exposes the production text-pipeline workflow gate, has desktop App Server smoke plus structured-turn commands, and the ready Plan/Design/Layout button is wired to a desktop structured-turn launcher. It still needs a recorded authenticated run from the packaged app surface that stores:

- live planning artifact bundle
- distinct approved Brief and Live Research Pack input artifact ids
- live schema repair evidence when a structured output fails
- live Design System artifact bundle
- live Layout IR artifact bundle
- five-slide context consistency evidence from the app surface

Until those bundles exist, DF-214 remains `Partial, external evidence required`.
