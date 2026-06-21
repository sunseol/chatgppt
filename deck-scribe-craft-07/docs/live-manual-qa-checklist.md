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

- `sessionDurationMs` greater than 0 and at or below 600000, plus completed setup tasks `new_project`, `login_check`, `prompt_input`
- `testerRole` set to `non_developer`
- `sessionEvidencePath` pointing to a persisted non-synthetic `docs/live-evidence/.../manual-qa` session JSON bundle for the observed QA session, not an uncommitted product-local path such as `manual-qa/session-20260619.json`, boundary-whitespace-padded path, temporary/observer session file such as `docs/live-evidence/manual-qa/tmp-session-20260619.json`, generic session or notes JSON such as `manual-qa/session-generic-20260619.json` or `manual-qa/session-notes-20260619.json`, template/sample/example/placeholder bundle, developer-local absolute, or `file://` path
- distinct approval target checks for `research_pack`, `slide_generation`, and `export`, with every target understood
- at least one opened canonical real HTTP(S) source URL that also appears in canonical final report sources, excluding boundary-whitespace-padded source URLs, placeholder, reserved documentation, private-network, or local domains/IPs
- at least one canonical `slide-<number>` regenerated slide id and one canonical `slide-<number>` edited title slide id; arbitrary tokens such as `1`, `abc`, or `slide-foo`, boundary-whitespace-padded slide ids, and `placeholder`, `template`, `sample`, `example`, `mock`, `fixture`, `test`, or `fake` slide ids do not count, and cannot be mixed into otherwise valid action lists
- opened export artifacts `png`, `project`, and `report`
- non-negative integer counters for critical errors, mock indicators, and placeholder outputs
- zero critical errors, zero mock indicators, and zero placeholder outputs
- a severity issue list using P0/P1/P2, where every logged issue has a non-empty title and reproduction/observation notes

Blocker codes: `tester_not_non_developer`, `missing_manual_qa_session_evidence`, `setup_over_time`, `missing_approval_target_check`, `approval_target_misunderstood`, `duplicate_approval_target_check`, `missing_real_source_open`, `invalid_real_source_url`, `placeholder_real_source_url`, `opened_source_not_in_report`, `missing_slide_regeneration`, `missing_title_edit`, `invalid_manual_qa_slide_action`, `missing_export_open`, `invalid_manual_qa_count`, `critical_issue_present`, `mock_indicator_present`, `placeholder_output_present`, `invalid_manual_qa_issue_log`, `missing_severity_issue_list`.

## Pass criteria

- Project task completes within 10 minutes.
- Tester is not a developer or implementation contributor, and the session has a persisted non-local evidence bundle.
- Tester explains the research, slide generation, and export approval gate targets with one distinct evidence event per target.
- At least one non-placeholder, non-reserved real source from the final report is opened and understood.
- One canonical non-placeholder slide is regenerated and accepted or rejected.
- One canonical non-placeholder title edit survives export.
- PNG/project/report artifacts are found.
- Critical errors, mock labels, placeholder outputs, and fixture artifacts are all zero.

## Current result

Not run. This checklist and the local evidence validator are ready for execution after DF-241 and DF-245 produce a clean production candidate.

## Current blocker evidence

2026-06-21 KST Release/Packaging lane recheck found GitHub issue #156 still open with `status:needs-live-evidence`. The current session is an autonomous developer worker running as user `jake` in `/Users/jake/chatgppt-lane-release-qa`, not a non-developer tester on a clean production candidate. DF-245 is still blocked by missing Developer ID signing/notarization, Gatekeeper acceptance, clean-machine execution, and image credentials, so DF-246 cannot honestly record a 10-minute non-developer manual QA session yet.

Local update: `src/lib/live-manual-qa-session-evidence.ts` now also rejects
`sessionEvidencePath` values that only become valid after trimming boundary
whitespace. A padded `docs/live-evidence/manual-qa/session-20260619.json` path remains
`missing_manual_qa_session_evidence` instead of satisfying the observed session
bundle requirement.

Local update: `src/lib/live-manual-qa-session-evidence.ts` now also requires
the observed session bundle to live under committed `docs/live-evidence/...`
paths. A product-local-looking `manual-qa/session-20260619.json` path remains
`missing_manual_qa_session_evidence` until the non-developer QA bundle is copied
into the reviewable release evidence tree.

Local update: `src/lib/live-manual-qa-evidence.ts` now also requires
regenerated and title-edited slide ids to be canonical before they can count as
manual QA actions. A padded slide id such as ` slide-3 ` no longer satisfies
`missing_slide_regeneration` or `missing_title_edit` by trimming into a plausible
slide id.

Local update: `src/lib/live-manual-qa-slide-actions.ts` now also rejects every
non-empty invalid slide action id, even when another slide action id in the same
list is canonical. A manual QA bundle with `slide-3` plus
`placeholder-slide` now blocks with `invalid_manual_qa_slide_action` instead of
silently dropping the contaminated reference.

Local update: `src/lib/live-manual-qa-slide-actions.ts` now also requires manual
QA slide action ids to use the canonical `slide-<number>` shape. Marker-free
tokens such as `1`, `abc`, or `slide-foo` now block with
`missing_slide_regeneration`, `missing_title_edit`, and
`invalid_manual_qa_slide_action` instead of satisfying the action checklist.

Local update: `src/lib/live-manual-qa-evidence.ts` now also requires the
observed manual QA session duration to be a positive value. A default
`sessionDurationMs: 0` no longer satisfies the under-10-minute setup requirement
without proving that an observed session actually happened.

Local update: `src/lib/live-manual-qa-source-evidence.ts` now also requires
opened source URLs and final report source URLs to be canonical before they can
match. A padded source such as ` https://www.w3.org/TR/WCAG22/ ` blocks with
`invalid_real_source_url` when opened, and cannot satisfy
`opened_source_not_in_report` when it appears only as a padded final report
source.

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
