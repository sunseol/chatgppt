# Frontend Live UX Ticket Plan

Date: 2026-06-23

Scope: DeckForge front-end rebuild plan for real live testing. The goal is to make the current live Codex/App Server work visible, understandable, and operable from the desktop UI without exposing developer-only wording as the primary experience.

## Product Direction

Visual thesis: restrained desktop production workspace, dense enough for repeated work, calm enough that state, blockers, and next actions are immediately scannable.

Content plan: workspace console -> project cockpit -> stage workbench -> connection/runtime settings -> artifact/provenance review.

Interaction thesis:

- Stable three-zone workbench: stage rail, primary artifact workspace, right-side inspector.
- Job state transitions are explicit: ready, running, succeeded, failed, cancelled, recovered.
- Advanced runtime/provenance details open in drawers, not in the primary path.

## Global UX Contracts

- Primary UI uses Korean utility copy. Internal English terms such as `App Server bridge`, `patch targets`, `required turn`, and raw provider ids are advanced details only.
- Packaged production UI must not silently fall back to mock/development output.
- Every disabled action must show the reason and the recovery action.
- Every live run must show provider/runtime state, job state, last result, and retry/cancel availability.
- Every approval must show artifact identity: stage, hash, prompt version, provider provenance, and approval time.
- Every project step must answer five questions without user interpretation: what input is used, what action is available, what output exists, what blocks progress, and what happens next.
- Front-end copy must not explain design implementation or internal architecture unless the user opens advanced diagnostics.

## Release Phases

| Phase | Target | Tickets | Exit criteria |
| --- | --- | --- | --- |
| Phase 1 | Trust and orientation | DF-FE-001 to DF-FE-013 | User can identify live connection state and current project blocker without reading code-like labels. |
| Phase 2 | Project creation and prompt control | DF-FE-020 to DF-FE-023 | User can create a strong project brief without prompt-engineering knowledge. |
| Phase 3 | Stage workbench rebuild | DF-FE-030 to DF-FE-038 | Each production stage has consistent input, run, output, approval, and recovery UX. |
| Phase 4 | Error recovery and destructive actions | DF-FE-040 to DF-FE-043 | Failures, delete, export, and local-data actions are predictable and reversible where possible. |
| Phase 5 | QA and packaged-app proof | DF-FE-050 to DF-FE-054 | Browser and Tauri tests prove the live UI can be operated from a DMG build. |

## Tickets

### DF-FE-001 - Workspace Console

Priority: P0

Goal: Replace the project list with a work console that shows live readiness and project progress at a glance.

Likely files:

- `src/components/deck/HomeScreen.tsx`
- `src/components/deck/HomeProjectList.tsx`
- `src/components/deck/LocalProjectDataControls.tsx`

Scope:

- Convert project rows into a denser operational list with columns for current stage, blocker, last updated, approvals, export status, and live readiness.
- Add search, sort, and status filters.
- Make open, export, delete, and local-folder actions visually distinct.
- Show empty state that starts real project creation, not sample/mock framing.

Acceptance criteria:

- A user can see which project is runnable, blocked, or ready for approval without opening it.
- Delete is not icon-only and requires confirmation.
- Local project controls do not visually compete with the main open action.

QA evidence:

- Component/integration test for project row states.
- Screenshot check for 0, 1, and 10 project states.

### DF-FE-002 - Project Cockpit Header

Priority: P0

Goal: Add a project-level header that explains current state, current stage, next action, and live runtime mode.

Likely files:

- `src/routes/project.$projectId.$step.tsx`
- `src/components/deck/Stepper.tsx`
- `src/lib/workflow-stepper.ts`

Scope:

- Add a compact cockpit above the stage workspace.
- Show project name, stage, approval count, runtime mode, latest job status, and next action.
- Replace silent redirects with visible "why you were moved here" state where applicable.

Acceptance criteria:

- Current stage and next action are visible without reading the left stepper.
- If a step is locked, the UI states the prerequisite approval or artifact.
- Production/development mode is explicit.

QA evidence:

- Route integration tests for reachable and locked steps.
- Screenshot check for locked, current, invalidated, and completed states.

### DF-FE-003 - Stepper Blocker Language

Priority: P0

Goal: Make the stepper useful as a workflow diagnostic, not just navigation.

Likely files:

- `src/components/deck/Stepper.tsx`
- `src/lib/workflow-stepper.ts`

Scope:

- Add blocker-specific detail for locked steps.
- Add invalidated state with "re-run required" language.
- Keep technical ids out of the primary labels.

Acceptance criteria:

- Every locked step has a human-readable reason.
- Invalidated steps explain which upstream change caused rework where data allows.

QA evidence:

- Unit tests for `getWorkflowStepItems`.
- Visual screenshot of all statuses.

### DF-FE-004 - Shared Stage Workbench Shell

Priority: P0

Goal: Standardize every stage around one layout: input context, live run controls, artifact output, approval, and diagnostics.

Likely files:

- `src/components/deck/stage-shared.tsx`
- `src/components/deck/GateBar.tsx`
- `src/components/deck/ProductionWorkflowStage.tsx`

Scope:

- Create shared workbench primitives for primary workspace and right inspector.
- Move run status, blocker list, approval status, and provenance into consistent locations.
- Keep the bottom gate bar for final actions only.

Acceptance criteria:

- Interview, Research, Plan, Design, Layout, Generate, Review, Editor, and Export can share the same structural pattern.
- The right inspector never contains unrelated help text or marketing copy.

QA evidence:

- Story-like fixture render or integration test for representative stage states.

### DF-FE-010 - Connection And Runtime Settings

Priority: P0

Goal: Replace the developer-centric settings modal with a user-facing live connection panel.

Likely files:

- `src/components/deck/HomeSettingsDialog.tsx`
- `src/components/deck/HomeToolDialog.tsx`
- `src/lib/desktop-app-server-bridge.ts`
- `src/lib/desktop-codex-login.ts`

Scope:

- Rename primary settings to `연결 및 실행 환경`.
- Replace `App Server bridge` with `Codex 연결`.
- Replace `Desktop runtime` with `데스크톱 실행 환경`.
- Replace `Live workflow smoke test` with `라이브 실행 테스트`.
- Show exact technical paths only in an expandable diagnostics section.

Acceptance criteria:

- User can find where Codex is connected from the settings screen.
- Login state, bridge availability, runtime version, and last smoke result are visible.
- Failure state shows a concrete action: login, retry, open terminal, or copy diagnostics.

QA evidence:

- Tauri command smoke test for status refresh.
- Integration test for unavailable, available, logged-in, and failed states.

### DF-FE-011 - Live Smoke Test UX

Priority: P0

Goal: Turn the current smoke test button into a clear live verification workflow.

Likely files:

- `src/components/deck/HomeSettingsDialog.tsx`
- `src/lib/codex-app-server-initialize-smoke.ts`
- `src-tauri/src/codex_app_server_smoke.rs`

Scope:

- Show last run time, result, turn/thread id when available, and error recovery.
- Use one primary action: `연결 확인`.
- Show progress while the test is running.

Acceptance criteria:

- Running smoke test cannot be double-submitted.
- Success and failure are visually distinct and actionable.
- Advanced details include raw command/path/error only when expanded.

QA evidence:

- Integration test for running/succeeded/failed states.
- Manual packaged-app screenshot after a successful live smoke.

### DF-FE-012 - Provider Readiness Relocation

Priority: P0

Goal: Remove the provider matrix from the new project form and move it into runtime readiness.

Likely files:

- `src/components/deck/NewProjectForm.tsx`
- `src/components/deck/ProviderCapabilityMatrix.tsx`
- `src/components/deck/HomeSettingsDialog.tsx`

Scope:

- New project form shows only a compact readiness badge.
- Full provider matrix moves to `연결 및 실행 환경`.
- Rows explain user-level impact, not provider architecture.

Acceptance criteria:

- New project creation is not visually dominated by provider diagnostics.
- User can still inspect provider capability details from settings.

QA evidence:

- New project screenshot before/after.
- Component test for compact readiness badge.

### DF-FE-013 - Production Mode Guard

Priority: P0

Goal: Make production, development, and mock states impossible to confuse.

Likely files:

- `src/routes/project.$projectId.$step.tsx`
- `src/components/deck/ProductionWorkflowStage.tsx`
- `src/lib/runtime-mode.ts`

Scope:

- Add an explicit runtime mode badge.
- Production mode must not show mock generation controls.
- Development mode must show a clear banner if mock/local stages are being used.

Acceptance criteria:

- In packaged production, mock-only controls are not presented as live actions.
- Development mode is visible enough that screenshots cannot be mistaken for production.

QA evidence:

- Route integration tests for production and development mode.
- Package scan remains clean of mock UI leakage in production assets where applicable.

### DF-FE-020 - New Project Brief Builder

Priority: P0

Goal: Replace free-form prompt dependency with a structured brief builder.

Likely files:

- `src/components/deck/NewProjectForm.tsx`
- `src/lib/deck-types.ts`
- `src/components/deck/interview-stage-model.ts`

Scope:

- Add fields for purpose, audience, expected outcome, must include, must avoid, success criteria, tone, source preference, language, slide count, and aspect ratio.
- Keep free-form prompt as an optional source field.
- Show missing required decisions before submit.

Acceptance criteria:

- User can create a usable project without writing a perfect prompt.
- The generated project still preserves the original prompt text.
- Required fields have clear validation and no code-like errors.

QA evidence:

- Form validation tests.
- Keyboard-only creation test.
- Korean text overflow screenshot.

### DF-FE-021 - Project Presets

Priority: P1

Goal: Replace mock-looking samples with practical brief presets.

Likely files:

- `src/components/deck/NewProjectForm.tsx`

Scope:

- Add presets: VC pitch, market research, executive report, product proposal, sales deck.
- Presets populate structured fields and remain editable.
- Preset selection should not imply sample/mock output.

Acceptance criteria:

- Selecting a preset fills relevant brief fields.
- User can change every generated field before project creation.

QA evidence:

- Component test for each preset.
- Screenshot check for default and selected states.

### DF-FE-022 - Prompt Settings Drawer

Priority: P0

Goal: Add user-facing prompt/run settings without exposing raw prompt internals by default.

Likely files:

- `src/lib/prompt-assets.ts`
- `src/components/deck/ProductionWorkflowStage.tsx`
- New component under `src/components/deck/`

Scope:

- Show current stage prompt id, version, purpose, input source, output type, and live/offline policy.
- Raw prompt file path/hash appears only in advanced details.
- Allow user to inspect what Codex will do before running a stage.

Acceptance criteria:

- User can identify which prompt/version will be used for a live action.
- Advanced details expose `promptId`, `promptVersion`, `promptHash`, and `promptFilePath`.

QA evidence:

- Component test using `PROMPT_ASSET_MANIFEST`.
- Screenshot of collapsed and expanded settings.

### DF-FE-023 - Prompt Registry Screen

Priority: P1

Goal: Provide a consolidated prompt/version registry for troubleshooting and release evidence.

Likely files:

- `src/lib/prompt-assets.ts`
- `src/components/deck/HomeSettingsDialog.tsx`
- New component under `src/components/deck/`

Scope:

- List all core prompts by stage, version, hash, and file path.
- Show last used record when project data contains usage records.
- Provide copy diagnostics action.

Acceptance criteria:

- All entries from `CORE_PROMPT_IDS` are visible.
- Missing manifest entries fail visibly in development tests.

QA evidence:

- Unit/component test for manifest coverage.

### DF-FE-030 - Interview Live Workbench

Priority: P0

Goal: Make live interview questions, user answers, follow-up requirements, and final brief approval clear.

Likely files:

- `src/components/deck/ProductionTextWorkflowLauncher.tsx`
- `src/components/deck/ProductionLiveInterviewAnswers.tsx`
- `src/components/deck/ProductionWorkflowStage.tsx`

Scope:

- Replace `Ready to launch` and internal gate copy with Korean task copy.
- Show question turn, answer fields, follow-up requirements, brief artifact, and approval action.
- Preserve live provenance in the inspector.

Acceptance criteria:

- User can run questions, answer them, rerun brief generation, and approve without reading internal stage names.
- Follow-up required state explains exactly which answer is missing.

QA evidence:

- Integration test for follow-up-required and brief-ready states.
- Packaged-app manual run screenshot.

### DF-FE-031 - Research Live Workbench

Priority: P0

Goal: Make live web search, source capture, evidence references, and research approval usable.

Likely files:

- `src/components/deck/ProductionResearchWebSearchLauncher.tsx`
- `src/components/deck/ProductionResearchReview.tsx`
- `src/components/deck/ResearchSourcePreview.tsx`

Scope:

- Replace `Live Research Pack workflow` and `required turn` with user-facing copy.
- Show query queue, source list, capture status, claims, datasets, evidence refs, blockers, and reinforcement requests.
- Approval remains blocked until source/evidence/provenance gates pass.

Acceptance criteria:

- User can see why research approval is blocked.
- User can exclude sources and request reinforcement from the same workbench.

QA evidence:

- Integration test for blocked and approvable research pack.
- Manual live source screenshot bundle reference.

### DF-FE-032 - Plan Live Workbench

Priority: P0

Goal: Prioritize slide outline, evidence mapping, and schema validity over raw markdown.

Likely files:

- `src/components/deck/PlanStage.tsx`
- `src/components/deck/ProductionTextWorkflowLauncher.tsx`
- `src/components/deck/PlanPanels.tsx`

Scope:

- Use preview as primary view and raw markdown as advanced/edit view.
- Show slide count, evidence coverage, parser errors, and source-map blockers.
- Connect production run status to the same workbench pattern.

Acceptance criteria:

- User can approve only when plan parsing and evidence mapping are valid.
- Markdown editing has explicit save and dirty-state feedback.

QA evidence:

- Parser-valid and parser-invalid screenshots.
- Integration test for approval disabled state.

### DF-FE-033 - Design System Workbench

Priority: P1

Goal: Make design tokens editable and understandable without raw JSON being the primary UI.

Likely files:

- `src/components/deck/DesignStage.tsx`
- `src/components/deck/DesignPanels.tsx`

Scope:

- Promote token editors for color, type, canvas, component rules, and negative rules.
- Move raw JSON behind advanced view.
- Add visual warning for one-note palette, low contrast, or missing component rules where validators exist.

Acceptance criteria:

- User can modify design tokens and save before approval.
- Approval uses the edited draft.

QA evidence:

- Component test for dirty/save/approve flow.
- Screenshot of token editor and advanced JSON.

### DF-FE-034 - Layout Workbench

Priority: P1

Goal: Clarify that layout is an editable structure check before final image generation.

Likely files:

- `src/components/deck/LayoutStage.tsx`
- `src/components/deck/LayoutDraftWorkspace.tsx`
- `src/components/deck/LayoutValidationPanel.tsx`

Scope:

- Keep slide list, canvas, layer inspector, validation, and revision requests in a stable layout.
- Show revision count and validation blockers in the inspector.
- Replace explanatory paragraph with concise utility labels.

Acceptance criteria:

- User can select slide/layer, move layout layer, request revision, and see approval blockers.
- Validation messages are actionable.

QA evidence:

- Integration test for move layer and approval gate.
- Screenshot with validation errors.

### DF-FE-035 - Generate Workbench

Priority: P1

Goal: Make slide image generation feel like a recoverable production job.

Likely files:

- `src/components/deck/GenerateStage.tsx`
- `src/components/deck/ProviderJobProgressPanel.tsx`

Scope:

- Show job id, provider, progress, partial outputs, cancel, retry, recovered state, and blocked image-path reasons.
- Replace generic progress bar with job-state panel plus slide grid.

Acceptance criteria:

- User can understand whether generation is waiting, running, cancelled, failed, or recovered.
- Retry is available only for retryable failures.

QA evidence:

- Integration test for recovered job state.
- Screenshot for blocked image path and running generation.

### DF-FE-036 - Review And Regeneration Workbench

Priority: P1

Goal: Make slide review, selective regeneration, and before/after comparison explicit.

Likely files:

- `src/components/deck/ReviewStage.tsx`
- `src/components/deck/RevisionComparePanel.tsx`

Scope:

- Add per-slide approval state.
- Keep selected slide preview, revision instruction, must-keep list, and comparison visible.
- Do not allow "approve all" if failed or unreviewed slides exist once live state is available.

Acceptance criteria:

- User can request one-slide regeneration and approve or reject the revised candidate.
- Must-keep constraints are visible before submitting revision.

QA evidence:

- Integration test for revision comparison flow.

### DF-FE-037 - Editor Workbench Polish

Priority: P1

Goal: Make the editor read as a real layer editor with autosave and recovery state.

Likely files:

- `src/components/deck/EditorStage.tsx`
- `src/components/deck/EditorStagePanels.tsx`
- `src/components/deck/EditorTextInspector.tsx`
- `src/components/deck/useEditorAutosave.ts`

Scope:

- Surface autosave status and recovery status.
- Keep slide list, canvas, layer list, and text inspector stable.
- Add visible selected-layer affordance and transform constraints.

Acceptance criteria:

- User can select a layer, edit text, see autosave state, and move to export.
- Empty conversion state does not look like a mock placeholder.

QA evidence:

- Integration test for text edit persistence.
- Screenshot for empty, editing, and recovered states.

### DF-FE-038 - Export Workbench

Priority: P1

Goal: Make final export and lineage report understandable as release evidence.

Likely files:

- `src/components/deck/ExportStage.tsx`
- `src/components/deck/ExportStagePanels.tsx`
- `src/lib/generation-report.ts`

Scope:

- Split export files, final report, warnings, blockers, and approval log.
- Show package manifest summary and export hash.
- Make blocked export issues actionable.

Acceptance criteria:

- User can identify which files are ready and why export may be blocked.
- Final report includes prompt versions and live lineage when available.

QA evidence:

- Integration test for ready and blocked export.
- Manual export artifact screenshot.

### DF-FE-040 - Disabled Action Reason System

Priority: P0

Goal: Standardize disabled buttons and blocked actions across the app.

Likely files:

- `src/components/ui/button.tsx`
- `src/components/deck/GateBar.tsx`
- Stage components using approval/run buttons.

Scope:

- Add a reusable pattern for disabled reason and recovery action.
- Apply to run, approve, export, delete, and login-dependent actions.

Acceptance criteria:

- No primary workflow action is disabled without visible reason.
- Reasons are Korean and action-oriented.

QA evidence:

- Component test for disabled reason rendering.
- Accessibility check for keyboard/focus behavior.

### DF-FE-041 - Job State And Recovery Language

Priority: P0

Goal: Normalize live job state language across text, research, image, and export workflows.

Likely files:

- `src/components/deck/ProviderJobProgressPanel.tsx`
- `src/components/deck/ProductionTextWorkflowPanel.tsx`
- `src/components/deck/ProductionResearchWebSearchLauncher.tsx`

Scope:

- Standard states: waiting, running, succeeded, failed, cancelled, recovered.
- Standard actions: cancel, retry, open diagnostics, copy error.
- Preserve raw error in advanced diagnostics only.

Acceptance criteria:

- Same job state uses the same language across stages.
- Failure states always include next action.

QA evidence:

- Component tests for all job states.

### DF-FE-042 - Destructive And Local Data Actions

Priority: P1

Goal: Make delete, local folder open, and export project actions safe and clear.

Likely files:

- `src/components/deck/HomeProjectList.tsx`
- `src/components/deck/LocalProjectDataControls.tsx`

Scope:

- Add confirmation for local delete.
- Distinguish open folder, export folder, and delete actions.
- Add post-action feedback.

Acceptance criteria:

- User cannot accidentally delete a project with a single icon click.
- Export/open actions clearly state what file/folder will be touched.

QA evidence:

- Integration test for delete confirmation.

### DF-FE-043 - Help And Workflow Guide

Priority: P2

Goal: Replace thin help copy with a concise workflow guide.

Likely files:

- `src/components/deck/HomeToolDialog.tsx`

Scope:

- Add sections for create project, connect Codex, run stages, approve artifacts, recover failures, and export.
- Keep it operational, not marketing or architecture documentation.

Acceptance criteria:

- User can find where to connect Codex and what each stage means.
- Help text avoids internal provider implementation details.

QA evidence:

- Copy review and screenshot.

### DF-FE-050 - Visual Regression Baseline

Priority: P0

Goal: Establish screenshots for core states before and after front-end rebuild.

Likely files:

- `tests` or existing Playwright setup if present
- `docs/live-manual-qa-checklist.md`

Scope:

- Capture home, settings, new project, project cockpit, and representative stage states.
- Include narrow desktop/minimum Tauri window size.

Acceptance criteria:

- Baselines exist for P0 screens.
- Text does not overflow at the configured minimum window size.

QA evidence:

- Playwright screenshots committed or stored under documented artifact path.

### DF-FE-051 - Golden Path Browser Test

Priority: P0

Goal: Add a browser-level flow for project creation through at least Interview, Research, and Plan UI states.

Likely files:

- Existing test suite under `src` or Playwright config.

Scope:

- Create project with structured brief.
- Verify live readiness indicator.
- Run or simulate stage state transitions through UI.
- Assert blockers and approvals render correctly.

Acceptance criteria:

- Test fails if settings remain mock-like or if a primary action lacks state text.

QA evidence:

- Passing browser test output.

### DF-FE-052 - Tauri Settings Smoke Test

Priority: P0

Goal: Verify the packaged desktop UI can refresh Codex login/runtime status and run live connection check.

Likely files:

- `src/components/deck/HomeSettingsDialog.tsx`
- Tauri command tests where available.

Scope:

- Open settings in Tauri.
- Refresh login status.
- Run live connection check.
- Capture success/failure diagnostics.

Acceptance criteria:

- Packaged app shows connected Codex state when CLI is logged in.
- Failure output is readable and recoverable.

QA evidence:

- Manual or automated Tauri screenshot and command output summary.

### DF-FE-053 - Korean Copy, Overflow, And Accessibility QA

Priority: P1

Goal: Prevent broken Korean UI, clipped labels, and inaccessible workflow controls.

Likely files:

- All modified front-end components.

Scope:

- Check long Korean labels, project names, prompt text, and error messages.
- Keyboard focus order for dialogs, drawers, run buttons, and approvals.
- Color contrast for warning/error/success states.

Acceptance criteria:

- No core button or dialog text overflows at minimum Tauri window size.
- Dialogs can be closed and operated by keyboard.

QA evidence:

- Screenshot and accessibility checklist.

### DF-FE-054 - DMG Version And Release Note Hook

Priority: P1

Goal: Keep front-end DMG revisions distinguishable using the requested `0.0.0.xx` version convention.

Likely files:

- `package.json`
- `src-tauri/tauri.conf.json`
- `docs/production-clean-machine-runbook.md`
- Release script if present.

Scope:

- Document version bump requirement for every shared DMG.
- Add release note checklist item linking front-end changes and verification evidence.

Acceptance criteria:

- Every DMG shared for testing has an incremented `0.0.0.xx` identifier.
- Release notes name changed UX areas and known limitations.

QA evidence:

- Built artifact name includes incremented version.
- Release note includes verification commands/screenshots.

## Implementation Order

1. DF-FE-010, DF-FE-011, DF-FE-012: fix the visible Codex connection problem first.
2. DF-FE-001, DF-FE-002, DF-FE-003, DF-FE-004: rebuild the shell and common workflow structure.
3. DF-FE-020, DF-FE-021, DF-FE-022: make project creation and prompt settings usable.
4. DF-FE-030, DF-FE-031, DF-FE-032: make the first live path testable from Interview through Plan.
5. DF-FE-033 to DF-FE-038: complete the remaining stage workbenches.
6. DF-FE-040 to DF-FE-043: normalize failures, destructive actions, and help.
7. DF-FE-050 to DF-FE-054: verify browser, Tauri, Korean UI, and DMG release evidence.

## Definition Of Done

- `bun run typecheck` passes.
- `bun run lint` passes or new warnings are documented.
- Relevant unit/component/integration tests pass.
- At least one Playwright or equivalent visual pass verifies the changed screens.
- Packaged Tauri settings path is manually verified when touching Codex runtime UI.
- User-facing screens avoid primary-path internal labels.
- No production screen presents mock/development output as live output.

## Current Known Risks

- Live text and research connectors exist in parts of the UI, but stage screens still mix production launchers with mock/development stages.
- The new project form currently asks too little structured information for reliable prompt output.
- Provider readiness is currently too prominent in the project creation flow and too technical for normal users.
- Prompt versions are available in `PROMPT_ASSET_MANIFEST`, but are not yet surfaced as user-facing run settings.
- Existing automated tests may need updates because wording and layout changes are intentionally broad.
