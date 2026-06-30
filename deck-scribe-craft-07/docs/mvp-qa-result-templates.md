# MVP QA Result Templates

Date: 2026-06-28

Use these templates to record DeckForge `0.0.15` MVP visual QA and user UAT results. Keep evidence factual. Do not mark a release as accepted unless machine-verifiable evidence and the release owner sign-off exist.

## Run Summary

| Field                      | Value                                      |
| -------------------------- | ------------------------------------------ |
| Run id                     |                                            |
| Date                       |                                            |
| Candidate version          |                                            |
| Candidate artifact path    |                                            |
| Candidate artifact SHA-256 |                                            |
| Git SHA                    |                                            |
| Dirty worktree?            | Yes / No                                   |
| Execution mode             | Production live / Development mock / Mixed |
| Tester name or code        |                                            |
| Tester role                | Non-developer / Developer / Other          |
| Observer                   |                                            |
| QA owner                   |                                            |
| Machine/environment        |                                            |
| Screen size                |                                            |
| Recording path             |                                            |
| Evidence root path         |                                            |
| Overall result             | Pass / Blocked / Inconclusive              |
| Result scope               | Local MVP candidate only                   |

## Scenario Results

| Scenario                          | Result                | Duration | Evidence path | Notes |
| --------------------------------- | --------------------- | -------- | ------------- | ----- |
| First-run project creation        | Pass / Fail / Blocked |          |               |       |
| Live interview and brief approval | Pass / Fail / Blocked |          |               |       |
| Live research and source review   | Pass / Fail / Blocked |          |               |       |
| Live plan, design, and Layout IR  | Pass / Fail / Blocked |          |               |       |
| Visual QA before export           | Pass / Fail / Blocked |          |               |       |
| Title edit and export             | Pass / Fail / Blocked |          |               |       |
| Report comprehension              | Pass / Fail / Blocked |          |               |       |

## Golden Path Step Evidence

| Step                     | Completed? | Screenshot path | Artifact id/hash | Notes |
| ------------------------ | ---------- | --------------- | ---------------- | ----- |
| Login/provider readiness | Yes / No   |                 |                  |       |
| Live interview questions | Yes / No   |                 |                  |       |
| Live brief               | Yes / No   |                 |                  |       |
| Brief approval           | Yes / No   |                 |                  |       |
| Live research            | Yes / No   |                 |                  |       |
| Real source opened       | Yes / No   |                 |                  |       |
| Research approval        | Yes / No   |                 |                  |       |
| Live Deck Plan           | Yes / No   |                 |                  |       |
| Live Design System       | Yes / No   |                 |                  |       |
| Live Layout IR           | Yes / No   |                 |                  |       |
| Five live images         | Yes / No   |                 |                  |       |
| Slide regeneration       | Yes / No   |                 |                  |       |
| Title edit               | Yes / No   |                 |                  |       |
| Export                   | Yes / No   |                 |                  |       |
| Report opened            | Yes / No   |                 |                  |       |
| Restart/reopen           | Yes / No   |                 |                  |       |

## Source Evidence

| Source id | URL | Source type                            | Opened by tester? | Claim or number checked | Screenshot path | Notes |
| --------- | --- | -------------------------------------- | ----------------- | ----------------------- | --------------- | ----- |
| SRC-001   |     | Primary / Official / Secondary / Other | Yes / No          |                         |                 |       |
| SRC-002   |     | Primary / Official / Secondary / Other | Yes / No          |                         |                 |       |
| SRC-003   |     | Primary / Official / Secondary / Other | Yes / No          |                         |                 |       |

Source gate result:

- Three real URLs present: Yes / No
- At least one primary or official source: Yes / No
- Numeric claims have unit/period/geography/definition metadata: Yes / No
- Source blockers observed:

## Visual QA Slide Matrix

| Slide | Purpose | Text fit    | Safe area   | Korean rendering | Source labels     | Image integrity | Design consistency | Severity      | Evidence path |
| ----- | ------- | ----------- | ----------- | ---------------- | ----------------- | --------------- | ------------------ | ------------- | ------------- |
| 1     |         | Pass / Fail | Pass / Fail | Pass / Fail      | Pass / Fail / N/A | Pass / Fail     | Pass / Fail        | P0/P1/P2/None |               |
| 2     |         | Pass / Fail | Pass / Fail | Pass / Fail      | Pass / Fail / N/A | Pass / Fail     | Pass / Fail        | P0/P1/P2/None |               |
| 3     |         | Pass / Fail | Pass / Fail | Pass / Fail      | Pass / Fail / N/A | Pass / Fail     | Pass / Fail        | P0/P1/P2/None |               |
| 4     |         | Pass / Fail | Pass / Fail | Pass / Fail      | Pass / Fail / N/A | Pass / Fail     | Pass / Fail        | P0/P1/P2/None |               |
| 5     |         | Pass / Fail | Pass / Fail | Pass / Fail      | Pass / Fail / N/A | Pass / Fail     | Pass / Fail        | P0/P1/P2/None |               |

Visual QA summary:

- Hard visual checks passed: Yes / No
- P0 visual defects: 0 / count
- P1 visual defects with owner/workaround: Yes / No / N/A
- Agy + 6-model advisory score target met: Yes / No / N/A
- Advisory score evidence paths:
- Overall visual result: Pass / Blocked / Needs review

Note: advisory model review cannot override deterministic hard-gate failures.

## Regeneration and Edit Evidence

| Field                                | Value    |
| ------------------------------------ | -------- |
| Regenerated slide id                 |          |
| Regeneration request                 |          |
| Original artifact id/hash            |          |
| Regenerated artifact id/hash         |          |
| Before screenshot                    |          |
| After screenshot                     |          |
| Must-keep regions preserved?         | Yes / No |
| Title edited slide id                |          |
| Original title                       |          |
| Edited title                         |          |
| Edit persisted after navigation?     | Yes / No |
| Edit persisted after export?         | Yes / No |
| Edit persisted after restart/reopen? | Yes / No |

## Export Evidence

| Artifact                | Path | SHA-256 | Opened?        | Notes |
| ----------------------- | ---- | ------- | -------------- | ----- |
| PNG output              |      |         | Yes / No       |       |
| Project file            |      |         | Yes / No       |       |
| Report                  |      |         | Yes / No       |       |
| PPTX file               |      |         | Yes / No       |       |
| Final validation bundle |      |         | Yes / No / N/A |       |

Report checks:

- Sources listed: Yes / No
- Approval log listed: Yes / No
- Prompt versions listed: Yes / No
- Risks or known limits listed: Yes / No
- Export artifact identity listed: Yes / No
- No secret-like text: Yes / No

## UAT Questions

Record the tester answer in their own words.

| Question                                                      | Tester answer | Correct enough? | Notes |
| ------------------------------------------------------------- | ------------- | --------------- | ----- |
| What is this deck trying to persuade the audience to believe? |               | Yes / No        |       |
| Which source looked most trustworthy?                         |               | Yes / No        |       |
| Which number or claim should still be checked by a human?     |               | Yes / No        |       |
| Which slide was regenerated?                                  |               | Yes / No        |       |
| Which title was edited?                                       |               | Yes / No        |       |
| Where are the export artifacts?                               |               | Yes / No        |       |

UAT score:

- Correct answers: / 6
- Approval targets understood: / required gates
- Tester completed without implementation hints: Yes / No

## Issue Log

| Issue id   | Severity | Scenario/step | Expected | Actual | Reproduction notes | Evidence path | Owner | Status |
| ---------- | -------- | ------------- | -------- | ------ | ------------------ | ------------- | ----- | ------ |
| MVP-QA-001 | P0/P1/P2 |               |          |        |                    |               |       | Open   |

Severity definitions:

- P0: crash, data loss, secret exposure, source fabrication, mock artifact in production, blocked export, billing/credential confusion.
- P1: main workflow confusion, visual defect that undermines the deck, missing required evidence with workaround.
- P2: polish, copy, spacing, low-risk UX friction.

## Final QA Decision

| Field                                                           | Value                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| All P0 issues closed?                                           | Yes / No                                                 |
| All required Golden Path steps completed or explicitly blocked? | Yes / No                                                 |
| Visual QA passed?                                               | Yes / No                                                 |
| User UAT passed?                                                | Yes / No                                                 |
| Evidence complete enough for local MVP candidate?               | Yes / No                                                 |
| Evidence complete enough for public release?                    | No unless final release bundle separately passes         |
| QA decision                                                     | Accepted as local MVP candidate / Blocked / Inconclusive |
| QA owner sign-off                                               |                                                          |
| Sign-off time                                                   |                                                          |
| Release owner review needed?                                    | Yes                                                      |

Decision notes:

-
