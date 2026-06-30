# MVP Visual QA and User UAT Scenarios

Date: 2026-06-28

Scope: DeckForge `0.0.15` MVP release-candidate validation. This document is for local candidate and internal MVP evaluation only. It does not approve public release, notarized macOS distribution, or final Live Initial Version sign-off.

Primary question:

> Can a tester use DeckForge to produce one submission-quality, 5-slide Korean B2B SaaS pitch deck with real sources, coherent visuals, one regeneration, one title edit, export artifacts, and an understandable report?

## MVP Test Deck

Use one fixed deck type for all MVP QA sessions.

- Deck type: Korean B2B SaaS investor pitch deck
- Slide count: 5
- Aspect ratio: 16:9
- Seed prompt: `국내 B2B SaaS 투자 제안서를 5장으로 만들어줘. 매출 성장, 고객 유지율, 시장 기회를 포함해줘.`
- Required source behavior: at least three real source URLs, including at least one primary or official source
- Required image behavior: five live image/background artifacts with request metadata
- Required edit behavior: regenerate one slide and edit one title
- Required export behavior: open PNG, project, report, and PPTX outputs

## Session Roles

- Tester: target user or non-developer participant. The tester must not read implementation notes before the session.
- Observer: records timing, friction, visual defects, UAT answers, and evidence paths.
- QA owner: decides pass/fail using this document and `mvp-qa-result-templates.md`.
- Release owner: may not approve release from this document alone; final release still requires the release evidence bundle.

## Setup

- [ ] Record tester, observer, date, build version, DMG path, DMG SHA-256, git SHA, and dirty-worktree state.
- [ ] Start from a fresh local profile or cleared DeckForge project state.
- [ ] Use the fixed MVP seed prompt exactly.
- [ ] Confirm production mode is active or explicitly record if this is a development/mock dry run.
- [ ] Confirm Codex login status is visible in the app.
- [ ] Confirm image provider readiness or locked production image path decision is visible.
- [ ] Start screen recording before the tester begins.
- [ ] Prepare screenshot capture for every Golden Path step.
- [ ] Prepare severity log using P0/P1/P2.

## Scenario 1: First-Run Project Creation

Goal: the tester can start the MVP deck without engineering assistance.

Steps:

- [ ] Open DeckForge from the selected artifact.
- [ ] Create a new project from the empty or project-list screen.
- [ ] Enter the fixed MVP seed prompt.
- [ ] Confirm the project name, slide count, aspect ratio, and language.
- [ ] Open connection/settings if prompted.
- [ ] Confirm Codex login/provider readiness from visible UI.

Pass criteria:

- The tester creates the project without observer instructions.
- New project, login check, and prompt input complete within 10 minutes.
- No mock-only label appears in a production run.
- The next action is discoverable from the UI.

Evidence:

- Screenshot of empty/start state
- Screenshot after project creation
- Screenshot of provider/login readiness
- Timestamped notes for any confusion

## Scenario 2: Live Interview and Brief Approval

Goal: the tester understands that DeckForge works from a brief, not a single prompt.

Steps:

- [ ] Start live interview question generation.
- [ ] Answer required interview questions.
- [ ] If follow-up is required, answer the follow-up and rerun brief generation.
- [ ] Read the generated brief.
- [ ] Explain what will be approved before pressing the approval button.
- [ ] Approve the live brief.

Pass criteria:

- Question and brief outputs have production Codex provenance.
- The tester can explain purpose, audience, desired outcome, and success criteria.
- The tester understands that approval unlocks research.
- No fixture fallback or mock brief is used in a production run.

Evidence:

- Screenshot of interview questions
- Screenshot of completed answers
- Screenshot of generated brief
- Screenshot after brief approval
- Recorded explanation of what the approval means

## Scenario 3: Live Research and Source Review

Goal: the tester can inspect real sources and reject or question weak evidence.

Steps:

- [ ] Run live Research Pack generation.
- [ ] Wait for sources, claims, datasets, and evidence references.
- [ ] Open at least one real HTTP(S) source from the app.
- [ ] Confirm at least three real source URLs exist.
- [ ] Confirm at least one source is primary or official.
- [ ] Inspect one numeric claim and its source/evidence reference.
- [ ] Exclude or flag one weak source if the UI exposes the control.
- [ ] Explain what is being approved.
- [ ] Approve research only if source capture, evidence refs, and provenance blockers are clear.

Pass criteria:

- Sources are not cache-only or mock-only.
- Claims needing evidence link to source quote/table/dataset references.
- Source metadata is visible enough for the tester to judge trust.
- Pending reinforcement/source blockers prevent unsafe approval.

Evidence:

- Screenshot of Research Pack overview
- Screenshot of opened real source
- Screenshot of source/evidence metadata
- Screenshot of any blocker or approval-ready state
- List of source URLs and source types

## Scenario 4: Live Plan, Design System, and Layout IR

Goal: the generated structure, design direction, and layout are reviewable before slide generation.

Steps:

- [ ] Run live Deck Plan generation from approved research.
- [ ] Review slide outline and key message per slide.
- [ ] Run live Design System generation.
- [ ] Review typography, colors, spacing, and visual tone.
- [ ] Run live Layout IR generation.
- [ ] Review whether every slide uses the shared deck context and design system.
- [ ] Confirm schema repair behavior if any stage fails.

Pass criteria:

- Plan, design, and layout are separate live Codex turns with separate turn ids.
- The layout covers exactly five slides.
- The tester can understand what will be generated before images are requested.
- No fixture layout or mock deterministic layout is used in a production run.

Evidence:

- Screenshot of plan
- Screenshot of design system
- Screenshot of layout preview or Layout IR review
- Turn/thread ids or artifact ids from visible report/evidence when available

## Scenario 5: Visual QA Before Export

Goal: the deck looks coherent, readable, and non-sloppy before it is accepted.

Review every slide at desktop size and at the actual export preview size.

Hard visual checks:

- [ ] No text clipping or unreadable text.
- [ ] No important content outside the safe area.
- [ ] No incoherent overlap between title, chart, source, and visual elements.
- [ ] Korean text renders without replacement characters or broken fallback fonts.
- [ ] Numeric claims have source labels or report references.
- [ ] Five slides share a recognizable design system.
- [ ] Images do not contain random text, fake UI, fake charts, or source-like hallucinations.
- [ ] Thumbnails and selected slide preview match the approved slide state.
- [ ] Regenerated slide uses a new live artifact version and does not overwrite the approved original on failure.
- [ ] Visual changes requested by the tester are reflected without damaging must-keep regions.

Qualitative visual checks:

- [ ] Slide 1 clearly states the offer/thesis.
- [ ] Slides 2-4 support the argument with evidence or concrete structure.
- [ ] Slide 5 has a clear closing or next-action message.
- [ ] The deck avoids generic AI pitch-deck filler.
- [ ] The style feels suitable for a Korean B2B SaaS investor context.

Pass criteria:

- All hard visual checks pass.
- No P0 visual defect exists.
- P1 visual defects have a workaround and owner.
- The tester says the deck is usable as a draft they would continue from.

Evidence:

- Screenshot per slide
- Screenshot of all-slide gallery
- Screenshot before and after one regeneration
- Visual defect log with slide id, region, severity, and screenshot path

## Scenario 6: Title Edit and Export

Goal: one user edit survives export and the output bundle is understandable.

Steps:

- [ ] Select one slide title.
- [ ] Edit the title text.
- [ ] Confirm the edit persists after leaving and returning to the slide.
- [ ] Generate/export final artifacts.
- [ ] Open PNG output.
- [ ] Open project file or saved project artifact.
- [ ] Open final report.
- [ ] Open PPTX output.
- [ ] Restart/reopen the app and confirm the same project and final export artifact can be found.

Pass criteria:

- Title edit survives export and restart/reopen.
- PNG, project, report, and PPTX outputs are discoverable.
- Report identifies sources, prompts, approvals, risks, and export artifact identity.
- No secret-like values are visible in UI, report, recording, or exported text.

Evidence:

- Screenshot before title edit
- Screenshot after title edit
- Export artifact paths and hashes
- Screenshot of opened PNG
- Screenshot of report
- Screenshot of opened PPTX
- Restart/reopen screenshot

## Scenario 7: Report Comprehension

Goal: a non-implementer can understand what DeckForge produced and what still needs review.

Ask the tester:

- What is this deck trying to persuade the audience to believe?
- Which source looked most trustworthy?
- Which number or claim should still be checked by a human?
- Which slide was regenerated?
- Which title was edited?
- Where are the export artifacts?

Pass criteria:

- Tester answers at least five of six questions without implementation hints.
- Tester can distinguish generated content from approved/exported content.
- Tester can name at least one remaining risk or say no risk is listed.

Evidence:

- Tester answers in plain language
- Report screenshot or path
- Observer notes on confusing terms

## Severity Rules

| Severity | Definition                                                                                                                       | MVP handling                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| P0       | Crash, data loss, secret exposure, source fabrication, mock artifact in production, blocked export, billing/credential confusion | Blocks MVP RC acceptance                        |
| P1       | Main workflow confusion, visual defect that undermines the deck, missing required evidence with workaround                       | Blocks unless owner and workaround are recorded |
| P2       | Polish, copy, spacing, low-risk UX friction                                                                                      | Track for follow-up                             |

## MVP Session Pass

The session passes only if all are true:

- [ ] Scenario 1 setup tasks complete within 10 minutes.
- [ ] Live interview, research, plan, design, layout, image, regeneration, title edit, export, and report steps are all attempted.
- [ ] Any skipped step is explicitly recorded as blocker, not treated as pass.
- [ ] All hard visual checks pass or have accepted P1 owner/workaround.
- [ ] PNG, project, report, and PPTX outputs are opened.
- [ ] The tester understands approval targets.
- [ ] No P0 issue is present.
- [ ] Evidence paths are recorded in `mvp-qa-result-templates.md` format.
