# Live Manual QA Checklist

Date: 2026-06-18

Scope: DF-246 first-time user validation for the Live Initial Version.

## Setup

- Tester has not read implementation notes.
- Tester is a non-developer user.
- Observer has a timer and severity log.
- Build is production mode with mock provider unavailable.
- Codex login is connected.
- Image credential state is visible.
- Seed prompt: "국내 B2B SaaS 투자 제안서를 5장으로 만들어줘. 매출 성장, 고객 유지율, 시장 기회를 포함해줘."

## 10 minutes project task

Within 10 minutes, the tester must:

- create a new project
- confirm login/provider readiness
- enter the prompt
- understand each approval target
- open at least one real source
- regenerate one slide
- edit one title
- find PNG, project, and report outputs

## Severity log

| Severity | Definition                                                                                | Release handling                                                            |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| P0       | Data loss, security, source fabrication, payment/billing confusion, crash blocking export | Blocks release.                                                             |
| P1       | Major completion or comprehension issue with workaround                                   | Blocks release if related to data loss, security, billing, or source error. |
| P2       | Usability or polish issue                                                                 | Track with owner.                                                           |

## Local evidence contract

`src/lib/live-manual-qa-evidence.ts` validates the manual QA result after the session. The saved evidence must include:

- `sessionDurationMs` at or below 600000 and completed setup tasks `new_project`, `login_check`, `prompt_input`
- `testerRole` set to `non_developer`
- approval target checks for `research_pack`, `slide_generation`, and `export`, with every target understood
- at least one opened real HTTP(S) source URL, excluding placeholder or local domains
- at least one regenerated slide id and one edited title slide id
- opened export artifacts `png`, `project`, and `report`
- zero critical errors, zero mock indicators, and zero placeholder outputs
- a severity issue list using P0/P1/P2

Blocker codes: `tester_not_non_developer`, `setup_over_time`, `missing_approval_target_check`, `approval_target_misunderstood`, `missing_real_source_open`, `invalid_real_source_url`, `placeholder_real_source_url`, `missing_slide_regeneration`, `missing_title_edit`, `missing_export_open`, `critical_issue_present`, `mock_indicator_present`, `placeholder_output_present`, `missing_severity_issue_list`.

## Pass criteria

- Project task completes within 10 minutes.
- Tester is not a developer or implementation contributor.
- Tester explains the research, slide generation, and export approval gate targets.
- At least one non-placeholder real source is opened and understood.
- One slide is regenerated and accepted or rejected.
- One title edit survives export.
- PNG/project/report artifacts are found.
- Critical errors, mock labels, placeholder outputs, and fixture artifacts are all zero.

## Current result

Not run. This checklist and the local evidence validator are ready for execution after DF-241 and DF-245 produce a clean production candidate.
