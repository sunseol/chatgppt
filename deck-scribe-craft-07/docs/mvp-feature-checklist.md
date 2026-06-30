# MVP Feature Checklist

Date: 2026-06-28

Scope: DeckForge `0.0.15` MVP release-candidate feature review. This checklist tracks whether the MVP Golden Path is functional enough to run visual QA and user UAT. It is not a public release approval checklist.

## Version and Artifact Identity

| Check                       | Required result                                                        | Status  |
| --------------------------- | ---------------------------------------------------------------------- | ------- |
| App version is fixed        | `src-tauri/tauri.conf.json` and release artifact naming agree          | Pending |
| Build artifact is selected  | Exactly one DMG or app build is named for the QA run                   | Pending |
| Artifact checksum exists    | SHA-256 manifest matches the selected artifact bytes                   | Pending |
| Source identity is recorded | Git SHA and dirty-worktree state are captured                          | Pending |
| Evidence root is selected   | Screenshots, recordings, reports, and JSON evidence use one run folder | Pending |

## Golden Path Functionality

| ID        | Feature                  | MVP expectation                                                                     | Required evidence                   | Status  |
| --------- | ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------- | ------- |
| MVP-F-001 | Project creation         | New project can be created from a fresh state using the fixed MVP prompt            | Screenshot plus timestamp           | Pending |
| MVP-F-002 | Provider readiness       | App shows Codex/login/provider state without claiming false readiness               | Screenshot                          | Pending |
| MVP-F-003 | Live interview questions | Production run can request and store live interview questions                       | Question artifact id or screenshot  | Pending |
| MVP-F-004 | Live brief               | Required answers produce an approvable brief                                        | Brief screenshot plus artifact id   | Pending |
| MVP-F-005 | Brief approval           | User can approve brief and unlock research                                          | Approval log or screenshot          | Pending |
| MVP-F-006 | Live research pack       | App can generate a Research Pack from the approved brief                            | Research Pack artifact/provenance   | Pending |
| MVP-F-007 | Real source opening      | At least one real HTTP(S) source opens from the app                                 | Source URL and screenshot           | Pending |
| MVP-F-008 | Source coverage          | At least three real source URLs exist, one primary or official                      | Source list                         | Pending |
| MVP-F-009 | Evidence-backed claims   | Numeric/factual claims have evidence refs or blockers                               | Research evidence screenshot        | Pending |
| MVP-F-010 | Research approval        | Approval is blocked until provenance, evidence refs, and source capture are safe    | Approval gate screenshot            | Pending |
| MVP-F-011 | Live deck plan           | Approved research produces a 5-slide plan                                           | Plan artifact id/screenshot         | Pending |
| MVP-F-012 | Live design system       | Plan produces a design system with typography/color/spacing choices                 | Design artifact id/screenshot       | Pending |
| MVP-F-013 | Live Layout IR           | Design and plan produce a five-slide Layout IR                                      | Layout artifact id/screenshot       | Pending |
| MVP-F-014 | Image path decision      | Production image generation is locked to a real provider/artifact path              | Gate screenshot or artifact record  | Pending |
| MVP-F-015 | Five live images         | Five slide backgrounds/images are generated with request metadata                   | Image artifact ids/hashes           | Pending |
| MVP-F-016 | Review gallery           | Five slides render in gallery and selected preview                                  | Gallery screenshot                  | Pending |
| MVP-F-017 | Visual QA blockers       | Text collision, fake PNG, mock background, and missing stored artifacts are blocked | Blocker screenshot or test evidence | Pending |
| MVP-F-018 | One slide regeneration   | A selected slide can be regenerated without losing approved original on failure     | Before/after screenshots            | Pending |
| MVP-F-019 | Title edit               | One title can be edited and persists through export                                 | Before/after screenshots            | Pending |
| MVP-F-020 | Export package           | PNG, project, report, and PPTX outputs are generated and opened                     | Paths, hashes, screenshots          | Pending |
| MVP-F-021 | Final report             | Report includes sources, approvals, prompts, risks, lineage, and export identity    | Report path/hash                    | Pending |
| MVP-F-022 | Restart/reopen           | Project reloads after restart with the same final export artifact                   | Screenshot and artifact id          | Pending |

## Visual Quality Gates

| ID        | Gate               | Pass condition                                                                           | Status  |
| --------- | ------------------ | ---------------------------------------------------------------------------------------- | ------- |
| MVP-V-001 | Canvas fit         | No slide has out-of-bounds core content                                                  | Pending |
| MVP-V-002 | Text fit           | No clipped title/body/source text                                                        | Pending |
| MVP-V-003 | Korean rendering   | No replacement characters or broken Korean font fallback                                 | Pending |
| MVP-V-004 | Safe zones         | Titles, captions, sources, and CTAs stay inside safe margins                             | Pending |
| MVP-V-005 | Design consistency | The five slides share typography, colors, spacing, and component rhythm                  | Pending |
| MVP-V-006 | Source visibility  | Evidence-backed numbers show source labels or report references                          | Pending |
| MVP-V-007 | Image integrity    | No random text, fake chart, fake UI, or source-like hallucination inside image artifacts | Pending |
| MVP-V-008 | Regeneration delta | Requested regenerated region changes while must-keep regions remain stable               | Pending |
| MVP-V-009 | Export parity      | Exported PNG/report reflects the reviewed and edited state                               | Pending |
| MVP-V-010 | Visual severity    | No unresolved P0 visual issue remains                                                    | Pending |

## User UAT Gates

| ID        | Gate                       | Pass condition                                                                    | Status  |
| --------- | -------------------------- | --------------------------------------------------------------------------------- | ------- |
| MVP-U-001 | First-run completion       | New project, login check, and prompt input within 10 minutes                      | Pending |
| MVP-U-002 | Approval comprehension     | Tester explains brief, research, plan/design/layout, review, and export approvals | Pending |
| MVP-U-003 | Source trust               | Tester opens and comments on at least one real source                             | Pending |
| MVP-U-004 | Regeneration comprehension | Tester understands what changed in the regenerated slide                          | Pending |
| MVP-U-005 | Edit comprehension         | Tester can identify the edited title after export                                 | Pending |
| MVP-U-006 | Artifact discovery         | Tester finds PNG, project, report, and PPTX outputs                               | Pending |
| MVP-U-007 | Report comprehension       | Tester answers at least five of six report questions                              | Pending |
| MVP-U-008 | No implementation hints    | Tester completes core tasks without engineer-only explanation                     | Pending |

## Evidence and Release Safety Gates

| ID        | Gate           | Pass condition                                                                    | Status  |
| --------- | -------------- | --------------------------------------------------------------------------------- | ------- |
| MVP-E-001 | Recording      | Full UAT session recording exists or absence is explained                         | Pending |
| MVP-E-002 | Screenshots    | Each Golden Path step has at least one screenshot                                 | Pending |
| MVP-E-003 | Hashes         | Export artifacts and key reports have SHA-256 hashes                              | Pending |
| MVP-E-004 | Secret scan    | Evidence bundle has zero secret findings                                          | Pending |
| MVP-E-005 | Issue log      | Every P0/P1/P2 issue has severity, reproduction note, owner, and status           | Pending |
| MVP-E-006 | Dirty state    | Dirty-worktree status is recorded and result is labelled local candidate if dirty | Pending |
| MVP-E-007 | Sign-off scope | QA sign-off explicitly says internal MVP candidate, not public release            | Pending |

## Blocking Rules

Block MVP RC acceptance when any of these occur:

- A production run uses mock or fixture artifacts without explicit dry-run labelling.
- The tester cannot create a project or enter the prompt without observer instructions.
- The deck cannot produce five reviewable slides.
- Any source-backed claim is fabricated or lacks a blocker/evidence path.
- Any secret-like value appears in UI, exported files, report, recording, or evidence.
- Export is missing PNG, project, report, or PPTX output.
- Restart/reopen loses the project or final export artifact.
- A P0 issue remains open.

## Decision

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| Intended decision  | Internal MVP RC acceptance                      |
| Candidate version  |                                                 |
| Candidate artifact |                                                 |
| Candidate SHA-256  |                                                 |
| QA owner           |                                                 |
| Decision           | Pending / Accepted as local candidate / Blocked |
| Decision notes     |                                                 |
