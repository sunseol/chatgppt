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
- `sessionEvidencePath` pointing to a persisted non-synthetic `manual-qa` session JSON bundle for the observed QA session, not a generic notes JSON such as `manual-qa/session-notes-20260619.json`, template/sample/example/placeholder bundle, developer-local absolute, or `file://` path
- distinct approval target checks for `research_pack`, `slide_generation`, and `export`, with every target understood
- at least one opened real HTTP(S) source URL that also appears in the final report sources, excluding placeholder, reserved documentation, private-network, or local domains/IPs
- at least one non-placeholder regenerated slide id and one non-placeholder edited title slide id; `placeholder`, `template`, `sample`, `example`, `mock`, `fixture`, `test`, or `fake` slide ids do not count
- opened export artifacts `png`, `project`, and `report`
- non-negative integer counters for critical errors, mock indicators, and placeholder outputs
- zero critical errors, zero mock indicators, and zero placeholder outputs
- a severity issue list using P0/P1/P2, where every logged issue has a non-empty title and reproduction/observation notes

Blocker codes: `tester_not_non_developer`, `missing_manual_qa_session_evidence`, `setup_over_time`, `missing_approval_target_check`, `approval_target_misunderstood`, `duplicate_approval_target_check`, `missing_real_source_open`, `invalid_real_source_url`, `placeholder_real_source_url`, `opened_source_not_in_report`, `missing_slide_regeneration`, `missing_title_edit`, `missing_export_open`, `invalid_manual_qa_count`, `critical_issue_present`, `mock_indicator_present`, `placeholder_output_present`, `invalid_manual_qa_issue_log`, `missing_severity_issue_list`.

## Pass criteria

- Project task completes within 10 minutes.
- Tester is not a developer or implementation contributor, and the session has a persisted non-local evidence bundle.
- Tester explains the research, slide generation, and export approval gate targets with one distinct evidence event per target.
- At least one non-placeholder, non-reserved real source from the final report is opened and understood.
- One non-placeholder slide is regenerated and accepted or rejected.
- One non-placeholder title edit survives export.
- PNG/project/report artifacts are found.
- Critical errors, mock labels, placeholder outputs, and fixture artifacts are all zero.

## Current result

Not run. This checklist and the local evidence validator are ready for execution after DF-241 and DF-245 produce a clean production candidate.

## Current blocker evidence

2026-06-21 KST Release/Packaging lane recheck found GitHub issue #156 still open with `status:needs-live-evidence`. The current session is an autonomous developer worker running as user `jake` in `/Users/jake/chatgppt-lane-release-qa`, not a non-developer tester on a clean production candidate. DF-245 is still blocked by missing Developer ID signing/notarization, Gatekeeper acceptance, clean-machine execution, and image credentials, so DF-246 cannot honestly record a 10-minute non-developer manual QA session yet.

## 2026-06-21 Lane F Recheck

Lane F ran as developer user `jake` from `/Users/jake/chatgppt-lane-release-gates/deck-scribe-craft-07` and did not discover or produce a persisted non-developer manual QA session bundle. The current package is unsigned and Gatekeeper-rejected, and DF-245 clean-machine evidence is still missing.

DF-246 remains open. Next evidence needed: a non-developer tester session on a signed/notarized or explicitly approved production candidate, with a persisted non-synthetic `manual-qa` session JSON bundle, under-10-minute completion, source-open proof linked to final report sources, one regeneration, one title edit, opened PNG/project/report outputs, and zero critical/mock/placeholder indicators.

## 2026-06-21 Lane I Recheck

Lane I ran as autonomous developer user `jake` from
`/Users/jake/chatgppt-lane-auth-release-qa/deck-scribe-craft-07` and did not
find or produce a persisted non-developer manual QA session bundle. The current
fresh package is still unsigned, not notarized, and Gatekeeper-rejected, so it
is not a clean production candidate for non-developer QA.

DF-246 remains open. The next closeable evidence is still a real
non-developer, under-10-minute packaged-app session with validator-ready
`manual-qa` session JSON, approval-target understanding, real source open linked
to final report sources, slide regeneration, title edit, opened PNG/project/report
outputs, severity issue list, and zero critical/mock/placeholder indicators.
