# DF-154 Manual QA Scenarios

Purpose: validate that a first-time tester can create a DeckForge project, make a small edit, and understand the final report without engineering assistance.

Required build: run `bun run verify` and `bun run test:suite` before the session. Use the mock-provider/local path unless the test owner explicitly schedules a live-provider session.

## 사전 준비

- [ ] Record tester name, date, app build id, browser/desktop environment, and screen size.
- [ ] Start from a clean local storage state or a fresh local profile.
- [ ] Prepare the seed prompt: "국내 B2B SaaS 투자 제안서를 5장으로 만들어줘. 매출 성장, 고객 유지율, 시장 기회를 포함해줘."
- [ ] Confirm the tester has not read internal implementation notes.
- [ ] Open a timer visible only to the observer.
- [ ] Prepare note columns for timestamp, user action, observed friction, error, and recovery.

## 10분 신규 프로젝트 생성

Goal: a new user creates a 5-slide project and reaches final export readiness in 10 minutes using the mock-provider path.

- [ ] Start timer when the tester sees the empty project screen.
- [ ] Ask the tester to create a new project with the prepared seed prompt.
- [ ] Confirm slide count is set to 5 and language is Korean or mixed Korean.
- [ ] Observe whether the tester can identify the next action without prompting.
- [ ] Let the tester proceed through interview, research, plan, design, layout, generation, review, vectorize, editor, and export gates.
- [ ] At each approval gate, record whether the user understands what is being approved.
- [ ] Record any blocked state, validation warning, or recovery action shown by the app.
- [ ] Stop timer when the export package is ready and final report is visible.

Expected artifact evidence:

- [ ] Approval log contains interview, research, plan, design, layout, review, vectorize, editor, and export entries.
- [ ] Export package includes PNG, SVG, hybrid SVG, PPTX-compatible package, manifest, and redacted project file.
- [ ] Final report includes slide lineage, source references, approval log, risk section, prompt versions, and export package summary.

## 5분 편집 검증

Goal: the tester makes a small text edit and verifies that the final export/report still reflect an editable DeckForge result.

- [ ] Start a 5-minute timer after the project reaches the editor.
- [ ] Ask the tester to select the title text on slide 1.
- [ ] Ask the tester to change the title without changing chart/source values.
- [ ] Ask the tester to move one editable visual or text layer slightly while keeping it inside the safe margin.
- [ ] Confirm undo and redo are discoverable if the tester makes an accidental change.
- [ ] Confirm the edited layer remains editable and does not become baked into the background.
- [ ] Re-run or re-open export actions after the edit.
- [ ] Stop timer when the tester can explain which slide changed and which artifacts stayed stable.

## 최종 보고 이해 가능성

Goal: the tester can understand the final report well enough to explain what was generated, which sources were used, and what still needs review.

- [ ] Ask the tester to find the user prompt in the report.
- [ ] Ask the tester to identify two slide-source links or citations.
- [ ] Ask the tester to identify the export package path.
- [ ] Ask the tester to explain one remaining risk or confirm that none are listed.
- [ ] Ask the tester whether any part of the report feels like an opaque implementation log.
- [ ] Record the tester's plain-language summary of the deck in one or two sentences.

## 관찰 지표

| Metric | Observation method | Pass threshold |
| --- | --- | --- |
| New-project completion time | Timer from empty state to export-ready state | <= 10분 |
| Editing completion time | Timer from editor start to explained edit result | <= 5분 |
| Approval comprehension | Observer asks what is being approved at each gate | >= 7 of 9 gates explained correctly |
| Recovery clarity | Tester encounters or inspects blocked/recovery state | Tester can name next action without engineer help |
| Export completeness | Inspect export package summary | PNG, SVG, hybrid SVG, PPTX, manifest, project file present |
| Report comprehension | Tester answers report questions | 4 of 5 answers correct without implementation hints |
| Sensitive data exposure | Inspect project/export/report text | No API keys, bearer tokens, or raw secret-like values |

## 합격 기준

Pass the manual QA session only when all of these are true:

- [ ] New-project scenario completes within 10분.
- [ ] Editing scenario completes within 5분.
- [ ] No P0 blocker prevents export readiness.
- [ ] Export completeness metric passes.
- [ ] Final report comprehension metric passes.
- [ ] No sensitive data exposure is observed.
- [ ] Any P1 issue has an owner, severity, reproduction note, and follow-up ticket.

Fail the session if any of these occur:

- User cannot finish project creation without observer instructions.
- Export package is missing any required output family.
- Final report cannot be used to understand sources, approvals, or remaining risks.
- Secret-like values appear in local project files, export, report, UI, or logs.

## QA Dry Run 기록

Use this template for every run.

| Field | Value |
| --- | --- |
| Date |  |
| Tester |  |
| Observer |  |
| Build id |  |
| Environment |  |
| Project completion time |  |
| Editing completion time |  |
| Approval comprehension score |  |
| Report comprehension score |  |
| Export package path |  |
| Result | Pass / Fail |

Issues found:

- `QA-001`: severity, step, expected result, actual result, reproduction notes, owner.

Observer notes:

- Navigation friction:
- Copy or terminology confusion:
- Visual/layout issue:
- Recovery/error handling issue:
- Follow-up ticket links:
