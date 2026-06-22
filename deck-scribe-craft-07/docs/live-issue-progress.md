# Live Issue Progress

Date: 2026-06-19

Scope: tracked GitHub issues `#126` through `#157` (`DF-200` through `DF-247`).

## 2026-06-22 KST Packaged Evidence Index Covers All Open P0s

DF-241 / DF-242 local update: packaged Golden Path and benchmark evidence now
has a runnable ingestion surface at
`scripts/produce-df241-df242-packaged-evidence.ts`, with schema parsing in
`scripts/df241-df242-packaged-evidence-schema.ts` and validator-driven output in
`scripts/df241-df242-packaged-evidence-producer.ts`. The package script
`bun run evidence:df241-df242:produce -- <packaged-run.json> [output.json]`
turns a real packaged-run JSON bundle into
`df241-df242-packaged-run-evidence` while preserving blocked status when the
Golden Path or benchmark validators fail. This still does not close DF-241 or
DF-242; the missing input is the actual packaged app run bundle with signed
Golden Path evidence and five benchmark output bundles.

DF-233 local update: packaged image queue evidence now has a runnable intake at
`scripts/produce-df233-packaged-queue-evidence.ts`, with schema parsing in
`scripts/df233-packaged-queue-evidence-schema.ts` and retry/cancel/restart-resume
proof assembly in `scripts/df233-packaged-queue-evidence-producer.ts`. The
package script
`bun run evidence:df233:produce -- <queue-input.json> [output.json]` requires
same-session packaged retry, cancellation, and restart-resume queue evidence,
copied `docs/live-evidence/...` JSON paths, project-folder export proof, Codex
image provider jobs, and ready product queue validation before returning
`ready`. This still does not close DF-233; the missing input is the actual
packaged Codex OAuth image run with exported queue evidence for all three
scenarios.

DF-243 local update: packaged interruption evidence now has a runnable closure
intake at `scripts/produce-df243-interruption-closure-evidence.ts`, with schema
parsing in `scripts/df243-interruption-closure-evidence-schema.ts` and
validator-backed closure assembly in
`scripts/df243-interruption-closure-evidence-producer.ts`. The package script
`bun run evidence:df243:produce -- <interruption-input.json> [output.json]`
derives the required image partial-resume, app cancel snapshot, cancel signal,
approval gate, and export gate artifact paths from a real packaged interruption
matrix, then runs the existing DF-243 closure validator. This still does not
close DF-243; the missing input is the actual packaged app interruption matrix
and copied `docs/live-evidence/...` artifact bundle.

DF-235 local update: packaged Review-stage evidence now has a runnable intake at
`scripts/produce-df235-packaged-review-evidence.ts`, with schema parsing in
`scripts/df235-packaged-review-evidence-schema.ts` and same-session review proof
assembly in `scripts/df235-packaged-review-evidence-producer.ts`. The package
script `bun run evidence:df235:produce -- <review-input.json> [output.json]`
requires packaged Review-stage approval proof, failed-regeneration preservation
proof, copied `docs/live-evidence/...` review JSON, and visible before/after plus
preservation display artifacts before returning `ready`. This still does not
close DF-235; the missing input is the actual packaged Review-stage UI run that
captures both approval and failure-preservation proof against the current
package.

DF-244 local update: packaged usage disclosure evidence now has a runnable
intake at `scripts/produce-df244-packaged-usage-evidence.ts`, with schema
parsing in `scripts/df244-packaged-usage-evidence-schema.ts` and
validator-backed usage-stage assembly in
`scripts/df244-packaged-usage-evidence-producer.ts`. The package script
`bun run evidence:df244:produce -- <usage-input.json> [output.json]` validates a
same-run product summary, Codex OAuth billing confirmation record, usage
summary, and visible display proof through `evaluateLiveUsageSummary`. This
still does not close DF-244; the missing input is the actual packaged app usage
bundle with persisted confirmation JSON plus screenshot or recording proof for
latency, retry count, image count, and confirmation display.

DF-245 local update: production packaging evidence now has a runnable intake at
`scripts/produce-df245-production-packaging-evidence.ts`, with schema parsing in
`scripts/df245-production-packaging-evidence-schema.ts` and validator-backed
output in `scripts/df245-production-packaging-evidence-producer.ts`. The package
script `bun run evidence:df245:produce -- <packaging-input.json> [output.json]`
runs `evaluateProductionPackagingEvidence` against a captured production package,
release-trust, clean-machine, and runbook bundle. This still does not close
DF-245; the missing input is a real Developer ID signed, notarized, stapled, and
Gatekeeper-accepted package plus clean macOS account evidence.

DF-246 local update: packaged manual QA session evidence now has a runnable
intake at `scripts/produce-df246-packaged-manual-qa-evidence.ts`, with schema
parsing in `scripts/df246-packaged-manual-qa-evidence-schema.ts` and
validator-backed output in
`scripts/df246-packaged-manual-qa-evidence-producer.ts`. The package script
`bun run evidence:df246:produce -- <manual-qa-input.json> [output.json]` runs
the existing `evaluateLiveManualQaEvidence` checks against a captured session
bundle and keeps package-hash drift or developer self-test sessions blocked.
This still does not close DF-246; the missing input is a real non-developer
packaged-app manual QA session bundle.

DF-241 local update: Golden Path regeneration image evidence now requires both
a regeneration marker and input lineage to one of the initial live image
artifacts. A marker-only unrelated regenerated image can no longer satisfy
`missing_regenerated_live_image_artifact`; regression coverage lives in
`src/lib/live-golden-path-regeneration-image.test.ts`, and the validator is in
`src/lib/live-golden-path-image-evidence.ts`. DF-241 still cannot close until a
real packaged Golden Path run captures the signed report, screenshots/recording,
final validation bundle, text/research/source lineage, five initial images,
approved selected-slide regeneration, title edit, export, and restart/reopen
evidence.

DF-247 local update: the Packaged Live evidence index now requires blocked or
ready JSON artifacts for all ten remaining open P0 tickets: DF-205, DF-233,
DF-235, DF-241, DF-242, DF-243, DF-244, DF-245, DF-246, and DF-247. The branch
now includes blocked release evidence artifacts for DF-205 auth/secret
lifecycle, DF-233 image queue/retry/cancel/resume, DF-235 selected-slide
regeneration approval/preservation, and DF-244 usage disclosure alongside the
existing DF-241/242/243/245/246/247 artifacts.

`src/lib/packaged-live-evidence-index.test.ts` now proves that a six-entry index
which omits the still-open DF-205/233/235/244 tickets blocks with
`missing_packaged_live_ticket`, and
`src/lib/packaged-live-evidence-index-artifact.test.ts` verifies all ten
committed entry SHA-256 digests. This still does not close any ticket; every
entry remains `blocked` until the corresponding packaged/clean-machine/manual
QA live evidence is genuinely produced.

Current package basis for this index: `bun run package:dry-run` produced
`dist/deckforge-macos-dry-run.tgz` with SHA-256
`e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6`,
285,197 bytes, 27 archive members, and 18 app files.
The dry-run package path now writes a deterministic sorted tar/gzip archive and
normalizes prerendered TanStack route-match `u:` timestamps; the current
launcher runs a package wrapper that serves emitted JS/CSS assets from
`Resources/client/assets` before the SSR fallback, and two consecutive
`bun run package:dry-run` runs produced the same SHA-256 above.

DF-247 local update: each Packaged Live evidence index entry now carries the
same `packageArchiveSha256` as the top-level index. A child entry whose package
hash drifts from the current candidate blocks with
`packaged_live_artifact_package_mismatch`, and
`src/lib/packaged-live-evidence-index-artifact.test.ts` verifies that each
committed child evidence JSON also names the same package hash. This prevents a
future ready index from mixing current release metadata with evidence artifacts
captured against an older package archive.

DF-247 local update: Packaged Live evidence artifact paths now have to name the
ticket as a bounded path token, not merely as a substring. A path like
`notdf245-evidence.json` now blocks with
`packaged_live_ticket_path_mismatch` instead of satisfying DF-245 by accidental
substring match.

DF-233 local update: restart-resume queue evidence now rejects duplicate
artifact ids inside completed-before, completed-after, pending, or resumed
artifact lists. Duplicate ids now block with `invalid_restart_resume_evidence`
instead of being collapsed by set-based subset checks.

DF-233 / DF-243 real Codex OAuth update: the product slide generation queue now
propagates cancellation into `generateAndStoreSlideImageArtifact` immediately
before storage, so a live App Server image that returns after user cancellation
is recorded as cancelled and never writes PNG/metadata/provenance sidecars. The
real OAuth smoke at
`docs/live-evidence/codex-image/df243-live-codex-cancel-smoke-20260622/summary.json`
completed App Server thread `019eed0f-b516-7cc1-9b4d-f53ca1ec1d7c`, turn
`019eed0f-b799-7f91-98d7-67617abcb758`, in `254542ms`, wrote ready DF-233 queue
evidence plus DF-243 app-storage recovery and cancel-signal JSON, and confirmed
no slide image artifact was stored. DF-233 and DF-243 remain open until packaged
app evidence captures the corresponding retry/cancel/resume and full
interruption-matrix artifacts.

DF-245 local update: `src/lib/df245-generated-evidence-artifact.test.ts` now
reads the three committed DF-245 generator outputs, checks that package recheck,
dry-run launch smoke, and release-trust blocker evidence all reference the
current dry-run archive SHA-256, verifies package content scans remain clean,
and preserves the external signing/notary/Gatekeeper/clean-machine blockers as
blocked evidence. This protects the evidence pipeline from hash drift but does
not replace Developer ID signing, notarization, stapling, Gatekeeper acceptance,
or clean-machine execution evidence.

DF-244 local update: the Lane D usage evidence generator now derives its
manifest blocker from `resolveLaneDImageBillingConfirmation`. A future packaged
Codex OAuth confirmation record can update the manifest away from the stale
"no persisted confirmation" blocker, while absent or mismatched records still
leave the summary blocked as `missing_app_surface_pre_generation_confirmation`.
`scripts/lane-d-live-usage-confirmation.test.mjs` covers the aligned confirmed
and missing blocker states. DF-244 remains open until packaged app UI evidence
captures the same-run confirmation and display proof.

## 2026-06-22 KST DF-246 Same-Session Manual QA Payload

DF-246 local update: `src/lib/df246-release-evidence-artifact.test.ts` now
reads the committed DF-246 release JSON and verifies that the manual QA handoff
package SHA, checklist SHA, and package-recheck SHA all match the current files.
It also preserves the non-developer session and zero-critical-issue missing
evidence as blocked requirements. This protects the handoff from hash drift but
does not replace the required non-developer packaged-app QA session.

DF-246 local update: manual QA readiness now requires the persisted
`sessionEvidencePath` JSON to provide a `manual_qa_session` payload that matches
the same evidence path and observed session fields. A copied payload from
another manual QA bundle now blocks with `missing_manual_qa_session_evidence`
instead of satisfying the checklist by borrowing a plausible session JSON.
Regression coverage lives in `src/lib/live-manual-qa-session-evidence.test.ts`,
with shared fixtures in `src/lib/live-manual-qa-test-fixtures.ts`.

This still does not close DF-246. The ticket still needs a real
non-developer, under-10-minute packaged-app session with a persisted
non-synthetic manual QA session bundle and clean output/source/action evidence.

## 2026-06-22 KST DF-247 Same-Decision Release Payload

DF-247 local update: the final release gate now requires the canonical
`docs/live-release-decision.md` record to include a `live_release_decision`
payload whose document path, approval state, recorded-decision flag, and known
limits flag match the gate input. A copied payload from a blocked decision state
now blocks with `missing_release_decision` instead of satisfying the final gate
with optimistic booleans alone. Regression coverage lives in
`src/lib/live-release-gate.test.ts`, with shared ready-state fixtures in
`src/lib/live-release-gate-test-fixtures.ts`.

This still does not close DF-247. The ticket still needs every upstream packaged
evidence entry ready plus an actually approved release decision.

## 2026-06-22 KST DF-243 Same-Matrix Closure Payload

DF-243 local update: interruption closure evidence now requires the cited
matrix JSON payload to match the closure manifest's `matrixEvidencePath`, report
path, scenario job ids, recovery snapshot paths, cancel-signal path, and
interrupted approval/export gate paths. A copied matrix payload from another
evidence path now blocks with `missing_interruption_matrix_evidence` instead of
letting a closure manifest borrow a ready-looking matrix object.
Regression coverage lives in `src/lib/live-interruption-closure-evidence.test.ts`,
with payload validation in `src/lib/live-interruption-closure-payload.ts`.

This still does not close DF-243. The ticket still needs packaged-run image
partial resume, app cancel snapshot, cancel signal, and interrupted
approval/export gate evidence generated by the product writers.

## 2026-06-22 KST DF-246 Canonical Slide Action Shape

DF-246 local update: manual QA regeneration and title-edit slide action ids now
have to use the canonical `slide-<number>` shape before they can count. A bundle
whose action lists contain marker-free arbitrary tokens such as `1`, `abc`, or
`slide-foo` now blocks with `missing_slide_regeneration`,
`missing_title_edit`, and `invalid_manual_qa_slide_action` instead of satisfying
the checklist with plausible-looking but non-slide references. Regression
coverage lives in `src/lib/live-manual-qa-slide-actions.test.ts`.

This still does not close DF-246. The ticket still needs a real
non-developer, under-10-minute packaged-app session with a persisted
non-synthetic manual QA session bundle and clean output/source/action evidence.

## 2026-06-22 KST DF-242 Mixed Image Turn/Request Identity Reuse

DF-242 local update: the top-level benchmark report path must now be the exact
committed `docs/live-benchmark-report.md` path. A same-named report at
`tmp/live-benchmark-report.md` now blocks with
`missing_live_benchmark_report` instead of satisfying DF-242 by filename suffix.
Regression coverage lives in `src/lib/live-benchmark-report-path-evidence.test.ts`.

This still does not close DF-242. The ticket still needs real five-scenario
Live benchmark output bundles tied to the current package candidate, with at
least four passing named Live runs.

DF-242 local update: benchmark output bundle image provider identity checks now
validate both Codex image turn ids and legacy/request ids when both are present.
A benchmark bundle pair with distinct `liveImageTurnIds` but reused
`liveImageRequestIds` now blocks with `duplicate_output_bundle_image_request`
instead of hiding the reused request evidence behind the turn-id list.
Regression coverage lives in
`src/lib/live-benchmark-cross-run-artifact-uniqueness.test.ts`.

This still does not close DF-242. The ticket still needs real five-scenario
Live benchmark output bundles tied to the current package candidate, with at
least four passing named Live runs.

## 2026-06-22 KST DF-245 Canonical Clean macOS Account Evidence

DF-245 local update: clean-machine account evidence now has to use the exact
canonical persisted path `release-evidence/clean-machine/clean-macos-account.json`.
A generic JSON filename that merely borrows the `clean-machine` directory and
`macos-account` marker, such as
`release-evidence/clean-machine/session-macos-account.json`, now blocks with
`missing_clean_machine_account_evidence`. Regression coverage lives in
`src/lib/production-packaging-clean-machine-account.test.ts`.

This still does not close DF-245. The ticket still needs real clean macOS
account validation, Developer ID signing, notarization, stapling, Gatekeeper
acceptance, and persisted release-trust assessment bundle capture.

## 2026-06-22 KST DF-246 Contaminated Manual QA Slide Actions

DF-246 local update: manual QA slide action evidence now rejects every
non-empty invalid regeneration or title-edit slide id, even when another id in
the same action list is canonical. A bundle with `slide-3` plus
`placeholder-slide` or `template-title-slide` now blocks with
`invalid_manual_qa_slide_action` instead of silently dropping the contaminated
reference and reporting the evidence as ready. The slide-action checks were
split into `src/lib/live-manual-qa-slide-actions.ts` to keep the manual QA
evidence orchestrator below the 250 pure-LOC ceiling. Regression coverage lives
in `src/lib/live-manual-qa-slide-actions.test.ts`.

This still does not close DF-246. The ticket still needs a real
non-developer, under-10-minute packaged-app session with a persisted
non-synthetic manual QA session bundle and clean output/source/action evidence.

## 2026-06-22 KST DF-247 Complete Final Export Lineage Metadata

DF-247 local update: the final release gate now requires the Golden Path final
export lineage to carry canonical Codex `turnId` and `threadId` values plus
nonblank model/runtime and prompt-version metadata before it can count as a
production Codex session. A final export provenance row with
`turnId: " turn_final "` or empty `modelOrRuntime` / `promptVersion` now blocks
with `golden_path_export_not_live` instead of trimming or under-specifying its
way into release readiness. Regression coverage lives in
`src/lib/live-release-gate-final-export.test.ts`.

This still does not close DF-247. The release remains blocked until all P0 Live
tickets are Verified Live and the real Golden Path, benchmark, interruption,
packaging, manual QA, evidence-index, release decision, and known-limits
artifacts are ready.

## 2026-06-22 KST DF-245 Canonical Developer ID TeamIdentifier Gate

DF-245 local update: native macOS release trust evidence now requires the
Developer ID TeamIdentifier value itself to be canonical before signing evidence
can count. A value such as ` TEAMID1234 ` no longer passes by trimming into a
valid 10-character team id; it blocks with `missing_developer_id_signature`.
Regression coverage lives in `src/lib/production-packaging-evidence.test.ts`.

This still does not close DF-245. The ticket still needs real clean macOS
account validation, Developer ID signing, notarization, stapling, Gatekeeper
acceptance, and persisted release-trust assessment bundle capture.

## 2026-06-22 KST DF-235 Canonical Comparison Target Gate

DF-235 local update: before/after approval comparison evidence now has to carry
exact canonical `requestedChanges` and `preservedTargets`. The approval matcher
no longer trims target strings before comparing them with the regenerated
candidate's `mustChange` and `mustKeep` request provenance, so a comparison
bundle with values such as ` title text ` blocks with
`regeneration_comparison_mismatch` and preserves the approved original slide.
Regression coverage lives in
`src/lib/live-slide-regeneration-approval.test.ts`.

This still does not close DF-235. A real packaged Review-stage run still needs
to approve the regenerated v2 candidate from the app surface and capture
failed-regeneration original-preservation evidence in the Lane D bundle.

## 2026-06-22 KST DF-235 Preservation Check Approval Gate

DF-235 local update: before/after approval comparison evidence now has to prove
that every preserved target was actually kept. A comparison whose descriptors,
versions, background artifact id, `requestedChanges`, and `preservedTargets`
match the regenerated candidate can no longer approve the candidate if any
`preservationChecks` row reports `changed` or `missing`; it blocks with
`regeneration_preservation_check_failed` and preserves the approved original
slide. Regression coverage lives in
`src/lib/live-slide-regeneration-approval.test.ts`.

This still does not close DF-235. A real packaged Review-stage run still needs
to approve the regenerated v2 candidate from the app surface and capture
failed-regeneration original-preservation evidence in the Lane D bundle.

## 2026-06-22 KST DF-235 Review Evidence Path Marker Gate

DF-235 local update: review evidence paths now reject scratch or observer-marked
canonical-looking paths before they can persist into
`DeckProject.liveSlideRegenerationReviewEvidence`. Paths such as
`projects/tmp/live-evidence/df235-slide-regeneration-review-rev_235.json`,
`df235-slide-regeneration-review-generic.json`, or
`df235-slide-regeneration-review-observer.json` now block instead of being
accepted as packaged Review-stage approval or preservation evidence. Regression
coverage lives in `src/lib/live-slide-regeneration-review-evidence.test.ts`.

This still does not close DF-235. A real packaged Review-stage run still needs
to approve the regenerated v2 candidate from the app surface and capture
failed-regeneration original-preservation evidence in the Lane D bundle.

## 2026-06-22 KST DF-244 Malformed App Server Usage Gate

DF-244 local update: Codex image usage confirmation now has to be Codex
OAuth-shaped, not API-key-shaped. `src/lib/live-usage-billing-evidence.ts`
centralizes confirmation readiness and requires `apiKeyRequired: false`,
`userConfirmed: true`, a nonblank label, and a canonical
`usage/<project>/<job>/image-billing-confirmation.json` evidence path before
summary approval, formatted summaries, audit reports, or progress panels can
display `Codex image usage confirmed`. A confirmed-looking payload with
`apiKeyRequired: true` and a valid evidence path now blocks as
`missing_image_billing_confirmation` and renders `Codex image usage not
confirmed`. Regression coverage lives in
`src/lib/live-usage-summary.test.ts` and
`src/lib/live-usage-summary-billing-evidence.test.ts`.

This still does not close DF-244. Packaged app-surface manual QA still needs
real Codex image usage disclosure payloads plus the persisted pre-generation
confirmation JSON from the same run.

DF-244 local update: App Server `thread/tokenUsage/updated` usage parsing now
preserves malformed supplied numeric usage and cost fields as invalid evidence
instead of silently dropping them. A rich image usage payload with
`imageCount`, valid billing confirmation evidence, and malformed
`estimatedCostUsd` now blocks with `invalid_cost_amount`; malformed token counts
block as invalid supplied usage instead of becoming an unrecorded usage summary.
Regression coverage lives in `src/lib/live-app-server-usage-summary.test.ts`.

This still does not close DF-244. Packaged app-surface manual QA still needs
real Codex image usage disclosure payloads plus the persisted pre-generation
confirmation JSON from the same run.

## 2026-06-22 KST DF-244 Positive Duration Evidence Gate

DF-244 local update: usage summary duration evidence now has to be a positive
observed value. A provider stage with `durationMs: 0` no longer satisfies
latency evidence; it blocks with `invalid_duration` instead of passing as a
default or unobserved timing value. Regression coverage lives in
`src/lib/live-usage-summary-duration-evidence.test.ts`.

This still does not close DF-244. Packaged app-surface manual QA still needs
real Codex image usage disclosure payloads plus the persisted pre-generation
confirmation JSON from the same run.

## 2026-06-22 KST DF-246 Canonical Manual QA Slide Actions

DF-246 local update: manual QA regeneration and title-edit slide ids now have to
be canonical before they can count as required tester actions. A padded slide id
such as ` slide-3 ` no longer satisfies the regeneration or title-edit
requirement by trimming into a plausible slide id; it now leaves the evidence
blocked with `missing_slide_regeneration` and `missing_title_edit`. Regression
coverage lives in `src/lib/live-manual-qa-evidence.test.ts`.

This still does not close DF-246. The ticket still needs a real
non-developer, under-10-minute packaged-app session with a persisted
non-synthetic manual QA session bundle and clean output/source/action evidence.

## 2026-06-22 KST DF-246 Canonical Manual QA Source URLs

DF-246 local update: manual QA source-open evidence now requires both the opened
source URL and final-report source URL to be canonical before they can match. A
padded opened source such as ` https://www.w3.org/TR/WCAG22/ ` now blocks with
`invalid_real_source_url`, and a padded final-report source can no longer match
a clean opened URL after trimming. Regression coverage lives in
`src/lib/live-manual-qa-source-evidence.test.ts`.

This still does not close DF-246. The ticket still needs a real
non-developer, under-10-minute packaged-app session with a persisted
non-synthetic manual QA session bundle and clean output/source/action evidence.

## 2026-06-22 KST DF-246 Positive Manual QA Duration Gate

DF-246 local update: manual QA session duration now has to be greater than zero
before the under-10-minute setup requirement can pass. A default
`sessionDurationMs: 0` no longer satisfies observed non-developer QA evidence.
Regression coverage lives in `src/lib/live-manual-qa-duration-evidence.test.ts`.

This still does not close DF-246. The ticket still needs a real
non-developer, under-10-minute packaged-app session with a persisted
non-synthetic manual QA session bundle and clean output/source/action evidence.

## 2026-06-22 KST DF-233 Stored Image Artifact Evidence Gate

DF-233 local update: exported live image queue evidence now validates the stored
image artifact paths that prove completed slides were actually persisted.
`src/lib/live-image-queue-evidence-export.ts` blocks otherwise ready queue
evidence when a completed slide is missing its
`projects/{projectId}/slides/images/slide_{number}.v{version}.png` path, when a
stored image path is invalid or duplicated, or when a stored image path does not
match any completed queue slide. Regression coverage lives in
`src/lib/live-image-queue-evidence-export.test.ts`, including a false-ready
bundle with one completed slide and no stored PNG path.

This still does not close DF-233. A packaged Codex OAuth image run still needs
real 429/5xx retry provenance, in-flight cancellation evidence, and
restart-resume evidence against real provider jobs.

DF-233 local update: shared versioned image artifact path parsing now rejects
non-positive slide numbers and artifact versions before any gate can count a
path as versioned project image storage. Exported queue evidence also reuses that
parser, so a stored path such as
`projects/project_001/slides/images/slide_001.v0.png` blocks with
`stored_image_artifact_path_invalid` instead of satisfying completed-slide
storage evidence. Regression coverage lives in
`src/lib/image-artifact-path.test.ts` and
`src/lib/live-image-queue-evidence-export.test.ts`.

This still does not close DF-233. A packaged Codex OAuth image run still needs
real 429/5xx retry provenance, in-flight cancellation evidence, and
restart-resume evidence against real provider jobs.

DF-233 local update: exported live image queue evidence now rejects stored image
artifact paths whose versioned project image path still carries scratch or
template-like markers such as `tmp`, `temp`, `sample`, `example`,
`placeholder`, `generic`, or `observer`. A path such as
`projects/tmp/slides/images/slide_001.v1.png` blocks with
`stored_image_artifact_path_invalid` instead of satisfying completed-slide
storage evidence. Regression coverage lives in
`src/lib/live-image-queue-evidence-export.test.ts`.

This still does not close DF-233. A packaged Codex OAuth image run still needs
real 429/5xx retry provenance, in-flight cancellation evidence, and
restart-resume evidence against real provider jobs.

## 2026-06-22 KST DF-243 Interrupted Artifact Gate Product Evidence Export

DF-243 local update: the product now has a dedicated app-storage evidence writer
for the `interrupted_artifact_gate` scenario.
`writeLiveInterruptionGateEvidenceExport` persists three reviewable JSON
artifacts for a real interrupted artifact gate run:
`df243-interrupted-artifact-gate-recovery-snapshot-{jobId}.json`,
`df243-interrupted-artifact-gate-approval-{jobId}.json`, and
`df243-interrupted-artifact-gate-export-{jobId}.json`. The writer blocks if the
interrupted artifact ids are missing/noncanonical, if completed artifacts are
lost after restart, if approval/export gate evidence did not deny every
interrupted artifact, or if an interrupted artifact remains approvable/exportable.
Regression coverage lives in
`src/lib/live-interruption-gate-evidence-export.test.ts`.

This still does not close DF-243. The release closure artifact remains blocked
until packaged/authenticated runs capture the product-generated image
partial-resume, cancel, and interrupted-gate JSON artifacts under
`docs/live-evidence`.

## 2026-06-22 KST DF-243 Image Partial Resume Product Evidence Export

DF-243 local update: the product now also has a dedicated app-storage evidence
writer for the `image_partial_resume` interruption scenario.
`writeLiveInterruptionImageResumeEvidenceExport` persists
`projects/{projectId}/live-evidence/df243-image-partial-resume-recovery-snapshot-{jobId}.json`
only after the pre-restart completed artifacts survive, pending image artifact
ids are non-empty/canonical, and every resumed image artifact was pending before
restart. Regression coverage lives in
`src/lib/live-interruption-image-resume-evidence-export.test.ts`, including a
matrix-ready partial-resume scenario and the false-ready path where an
untracked image artifact is marked resumed.

This still does not close DF-243. The release closure artifact remains blocked
until a packaged/authenticated run captures the generated image partial-resume
snapshot, generated cancel snapshot/cancel-signal JSON, and interrupted approval
/ export gate artifacts.

## 2026-06-22 KST DF-243 Cancel Job Product Evidence Export

DF-243 local update: the product now has a dedicated app-storage evidence
writer for the `cancel_job` interruption scenario.
`writeLiveInterruptionCancelEvidenceExport` turns a real cancelled image queue
job into two persisted JSON artifacts:
`projects/{projectId}/live-evidence/df243-cancel-job-recovery-snapshot-{jobId}.json`
and
`projects/{projectId}/live-evidence/df243-cancel-job-cancel-signal-{jobId}.json`.
The writer refuses to emit evidence unless the cancelled queue failure, provider
job, preserved `cancelRequested` signal, matching retry attempt, and
slide-generation prompt usage all line up. Regression coverage lives in
`src/lib/live-interruption-cancel-evidence-export.test.ts`, including a
matrix-ready `cancel_job` scenario and the false-ready path where a cancelled
job lacks a preserved cancel signal.

This still does not close DF-243. The release closure artifact remains blocked
until a packaged/authenticated run captures the generated app-storage cancel
snapshot and cancel-signal JSON, plus the remaining `image_partial_resume` and
`interrupted_artifact_gate` recovery/gate artifacts.

## 2026-06-22 KST DF-243 Observed Snapshot Materialization

DF-243 local update: the blocked closure manifest now points at committed
observed recovery snapshot JSON for the two interruption scenarios that already
had real probe evidence. `text_turn_shutdown` is backed by
`docs/live-evidence/lane-h-20260621/text-turn-shutdown-recovery-snapshot.json`
with digest `27855e9afff031bc49c87bb08bb46ea6ac9a5436e4a2eef9ecb74382e62809b6`,
and `fetch_shutdown` is backed by
`docs/live-evidence/lane-h-20260621/fetch-shutdown-recovery-snapshot.json` with
digest `a472a031283e5a2ce537801d43a15b2d121241d823397868b81437c50e78bc3d`.
The committed matrix artifact now lives at
`docs/live-evidence/lane-h-20260621/df243-interruption-matrix.json`, and
`src/lib/live-interruption-closure-artifact.test.ts` verifies that the manifest,
matrix artifact, and observed snapshot files stay aligned.

This still does not close DF-243. The current closure validator now reports
missing recovery snapshots only for `image_partial_resume`, `cancel_job`, and
`interrupted_artifact_gate`; app-storage cancel, cancel-signal, and approval /
export gate evidence are still missing.

## 2026-06-22 KST DF-243 Interrupted Post-Restart Completion Gate

DF-243 local update: interruption matrix evaluation now rejects interrupted
`text_turn_shutdown` and `fetch_shutdown` scenarios that complete new artifacts
after restart. A row can no longer pass by preserving the pre-restart completed
artifacts while quietly adding a new completed text or fetch artifact after the
job recovered as `failed`, `interrupted`, or `cancelled`; it blocks with
`interrupted_job_completed_after_restart`. Regression coverage lives in
`src/lib/live-interruption-post-restart-artifact.test.ts`.

This still does not close DF-243. The real packaged Live interruption matrix
still needs app-produced image partial-resume, cancel snapshot/cancel-signal,
and interrupted approval/export evidence under `docs/live-evidence`.

## 2026-06-22 KST DF-243 Exact Matrix Report Path Gate

DF-243 local update: the interruption matrix report path must now be the exact
committed `docs/live-interruption-matrix.md` path before a matrix can count as
ready. Same-named reports in temporary or observer paths, such as
`tmp/live-interruption-matrix.md`, now block with
`missing_interruption_report`. Regression coverage lives in
`src/lib/live-interruption-report-path.test.ts`.

This still does not close DF-243. The real packaged Live interruption matrix
still needs app-produced image partial-resume, cancel snapshot/cancel-signal,
and interrupted approval/export evidence under `docs/live-evidence`.

## 2026-06-22 KST GitHub Open Issue Recheck

GitHub REST recheck confirms `#148` / DF-234 is already `closed` with
`state_reason: completed` (`closed_at: 2026-06-20T20:08:59Z`). The older
summary-table row that still says DF-234 is partial is superseded by the Lane D
Live artifact bundle update and the closed GitHub state.

Tracked issues still open in `#126`-`#157`: `#131` / DF-205, `#147` / DF-233,
`#149` / DF-235, `#151` / DF-241, `#152` / DF-242, `#153` / DF-243, `#154` /
DF-244, `#155` / DF-245, `#156` / DF-246, and `#157` / DF-247.

## 2026-06-22 KST Current Branch Canonical Evidence Recheck

DF-241/DF-242/DF-247 local update: Golden Path, benchmark, and final export
lineage evidence now rejects boundary-whitespace-padded durable paths and ids
instead of trimming them into readiness. `src/lib/live-golden-path-evidence-path.ts`
blocks padded report, screenshot, recording, and final validation bundle paths;
`src/lib/live-benchmark-evidence-path.ts` blocks padded benchmark report, scenario
report, output bundle, screenshot, and Golden Path report paths; and
`src/lib/live-benchmark-output-bundle.ts` requires final export artifact ids to
be canonical nonblank values. `src/lib/live-benchmark-package-hash.ts` now
requires the release package digest to be canonical lowercase 64-character
SHA-256 evidence, so an uppercase digest cannot be normalized into DF-242
readiness. `src/lib/live-generation-report-lineage.ts` now requires canonical
source ids, text artifact ids, text thread/turn ids, text prompt versions, image
artifact ids, image provider turn/request ids, and slide prompt versions before
a generation report can satisfy production export lineage. Regression coverage lives in
`src/lib/live-golden-path-e2e-canonical-path.test.ts`,
`src/lib/live-benchmark-report-path-evidence.test.ts`,
`src/lib/live-benchmark-evidence.test.ts`, and
`src/lib/live-generation-report-lineage-canonical.test.ts`.

These changes close local false-ready paths only. DF-241, DF-242, and DF-247
remain open until a real packaged Golden Path bundle, benchmark output bundle
set, and final release evidence index are produced from authenticated Codex
OAuth text/image runs.

## 2026-06-22 KST Packaged Evidence Index Materialized

DF-247 local update: the shared Packaged Live evidence index now exists at
`docs/live-evidence/release/packaged-live-evidence-index.json`, with per-ticket
blocked evidence artifacts for DF-205, DF-233, DF-235, DF-241, DF-242, DF-243,
DF-244, DF-245, DF-246, and DF-247 under `docs/live-evidence/release/`. The
index records the current dry-run package SHA-256 and each evidence artifact SHA-256, and
`src/lib/packaged-live-evidence-index-artifact.test.ts` verifies the committed
index plus entry file digests.

This is not a release approval. Every index entry remains `blocked` /
`validationKind: blocked`, so DF-247 still requires ready upstream packaged
auth/secret lifecycle, image queue, slide-regeneration, usage, Golden Path,
benchmark, interruption, packaging trust/clean-machine, and non-developer
manual QA evidence before the release decision can move from `Blocked` to
approved.

## 2026-06-21 Current Branch OAuth Image Route Recheck

DF-205/DF-230 local update: production image generation now rejects old persisted OpenAI API-key image decisions even if they were previously marked `locked` and contain binary/provenance artifact paths. `src/lib/production-image-generation-gate.ts` returns `production_codex_oauth_required` unless the persisted route is `codex` with `codexOAuth`; `src/lib/production-image-generation-gate-oauth-route.test.ts` covers the false-ready reload case. `src/lib/provider-selection-policy.ts` now filters production provider choices to Codex-only, `src/lib/image-path-decision.ts` excludes legacy locked `openaiImage` / `openaiApiKey` records from production provider choices, `src/lib/provider-capability-view.ts` converts legacy `openaiImage` / `openaiApiKey` fallback state into a Codex image capability lock instead of an API-key prompt, and `src/components/deck/ProductionWorkflowStage.tsx` describes generate-stage readiness through Codex OAuth image capability. This aligns the product with the current direction that image generation uses the signed-in Codex OAuth image capability, not API-key based image generation. DF-205 remains open because fresh login, logout/relogin, and clean packaged Codex OAuth image capability evidence still require a clean account or clean machine.

DF-241 local update: review-gallery live composition validation now accepts stored `codex` Codex OAuth image backgrounds as live image backgrounds. The previous rule accepted only `openaiImage`, which could block a future Golden Path after real Codex OAuth image generation even when stored PNG artifact identity, compositor SVG identity, title-edit re-export evidence, and overlay validation were otherwise ready. `src/components/deck/review-gallery-model.test.ts` covers the ready Codex OAuth compositor case. DF-241 remains open because the signed packaged Golden Path report, screenshots/recording, final validation bundle, real source evidence, regeneration, export, and restart/reopen evidence still have to come from a real run.

## 2026-06-21 Current Branch Packaging Sanitizer Recheck

DF-245 local packaging update: branch `jacobex/live-product-completion` now routes native Tauri release packaging through `bun run build:package`, which runs `vite build` and then `scripts/sanitize-package-build.mjs`. This fixes the previous false-clean path where `bun run package:dry-run` sanitized `dist/client` and `dist/server`, but `bun run tauri:build` recreated `dist/server` through the Tauri `beforeBuildCommand` and left generated TanStack manifest entries with developer-local absolute paths such as `/Users/jake/.../src/routes/__root.tsx`.

Fresh evidence: `bun test scripts/package-path-sanitizer.test.mjs` passes and covers the Tauri build-command wiring. `bun run build:package` passes and fixed-string scans of `dist/client` plus `dist/server` report 0 hits for `mock-provider`, `MOCK MODE`, `.omx`, `.playwright-mcp`, `/Users/jake`, `CODEX_SESSION=`, `OPENAI_API_KEY=`, and `auth.json`. `bun run package:dry-run` regenerated `dist/deckforge-macos-dry-run.tgz` with SHA-256 `aacadd4cd4546ce20b084b1fbf8018e9571a635983ad9aa30b07a123c705985e`, 283,066 bytes, 26 archive members, and 17 extracted app files. `bun run tauri:build` regenerated the native binary with SHA-256 `f886f3dc8c9e5c968a7a5a80134814a72b629c9fdbf0bff05e570408a7003c65` and copied the DMG to `release-artifacts/DeckForge_0.1.0_aarch64.dmg`; `shasum -a 256 -c release-artifacts/DeckForge_0.1.0_aarch64.dmg.sha256` verifies DMG SHA-256 `d6849d24c5af4548b7b35e65a68a05c8d139be4b1b5504d7c3da3a3dc9e2d467`, 1,833,575 bytes. Scans of `dist/client`, `dist/server`, the dry-run app bundle, and native `.app` found 0 hits for mock provider markers, mock mode labels, `.omx`, `.playwright-mcp`, local workspace paths, assigned Codex/OpenAI secrets, and bundled auth files; `sk-*` regex hits were Tailwind CSS utility identifiers such as `sk-image-linear-from-pos`, not secrets.

DF-245 remains open because this is still a developer-machine unsigned package run. Developer ID signing, notarization, stapling, Gatekeeper acceptance, persisted release-trust assessment evidence, and clean macOS account install/login/image credential/project launch/live interview evidence are still missing.

## 2026-06-21 Lane F Release Gates Update

DF-245 live update: branch `jacobex/live-lane-release-gates` regenerated the unsigned dry-run archive `dist/deckforge-macos-dry-run.tgz` with SHA-256 `cec0077d117f8cc2d863db2075bbbd55cc812830e91233474a9f550ee6de427b`, 17 app files, and 287,894 bytes. The fresh DMG `release-artifacts/DeckForge_0.1.0_aarch64.dmg` has SHA-256 `232d0fd67eed137ff8b048848823d95cd71f2c8cd044a07ba279defd0a934108`; its `.sha256` file verifies. Fixed-string scans of the dry-run app bundle, native `.app`, and mounted DMG found 0 mock provider id, mock stage, fixture/test path, local workspace path, `.omx`, `.playwright-mcp`, or assigned secret hits. The app remains ad-hoc signed with no TeamIdentifier, no local Developer ID identities were found, `notarytool` has no credentials, and Gatekeeper rejects the DMG with `source=no usable signature`. Best available isolated smoke used a temporary HOME and served `/` from the unsigned dry-run package, but this is not clean-machine evidence. DF-245 remains blocked on Developer ID signing/notarization/stapling, release-trust evidence, Gatekeeper acceptance, and clean macOS account install/login/image credential/project launch/live interview evidence.

DF-241, DF-242, DF-243, DF-246, and DF-247 remain open. Lane F found no signed Golden Path bundle, benchmark output bundles, completed interruption matrix, non-developer manual QA bundle, or final release-gate evidence that satisfies the live acceptance criteria.

Status vocabulary:

- Implemented contract: local code or documentation now enforces the acceptance-contract slice that can be verified without external Live credentials.
- Partial, external evidence required: local contract exists, but the issue cannot be closed without real provider/package/manual evidence.
- Blocked by upstream Live evidence: the issue is primarily an execution/evidence ticket and cannot be honestly marked complete from local code alone.

| Ticket | Current status                      | Local evidence added or confirmed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Remaining requirement before close                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DF-200 | Closed on GitHub                    | `docs/live-readiness-audit.md`; closed as completed in `#126` after the audit artifact and package/fixture scan evidence were recorded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Re-run after every live adapter cutover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| DF-201 | Closed on GitHub                    | `docs/ticket-status-migration-report.md`; closed as completed in `#127` after the status migration report covered the required historical ticket set.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | None for the current GitHub issue.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| DF-202 | Closed on GitHub                    | `src/lib/runtime-mode.ts`, `src/lib/runtime-mode.test.ts`, `src/lib/provider-selection-policy.ts`, `src/lib/provider-selection-policy.test.ts`, `src/lib/provider-runtime-selection.test.ts`, `src/lib/production-route-isolation.test.ts`, `src/lib/final-export-gate.test.ts`, `src/components/deck/ExportStage.integration.test.tsx`, dry-run package scan; closed as completed in `#128` after production mock providers were rejected before job startup, provider failure recovery exposed retry/manual recovery without mock or fixture fallback, development mock output kept a `MOCK MODE` banner, runtime audit fields included execution mode/provider kind/id, production provider choices omitted mock providers, and the package scan excluded mock/fixture/test/local path resources.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | None for DF-202. Real provider stage cutover evidence remains tracked by the stage-specific Live cutover tickets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| DF-203 | Closed on GitHub                    | `src/lib/provider-provenance.ts`, `src/lib/provider-provenance.test.ts`, `src/lib/research-source-fetcher.ts`, `src/lib/research-source-fetcher.test.ts`, `src/lib/project-list-codec.ts`, `src/lib/project-list-codec.test.ts`, `src/lib/live-research-approval-gate.test.ts`, `src/components/deck/ProductionWorkflowStage.integration.test.tsx`; closed as completed in `#129` after provider artifacts preserved execution mode, provider kind, auth mode, model/runtime, prompt version, fixture flag, duration, input ids, Codex turn/thread ids, and image turn ids; source fetches preserved URL/fetch/hash metadata; approvals blocked missing provenance; persisted Research Packs normalized to current live evidence/provenance fields on restart.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | None for DF-203. Historical production project QA remains part of clean-machine/live migration validation, not the provenance schema contract.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| DF-204 | Closed on GitHub                    | `src/lib/provider-status-view.ts`, `src/components/deck/ProviderCapabilityMatrix.tsx`, `src/lib/provider-capability-view.test.ts`, `src/components/deck/ProviderCapabilityMatrix.integration.test.tsx`; closed as completed in `#130` after the integration test rendered the `Unavailable` disconnected state with locked remediation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | None for the current GitHub issue.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| DF-205 | Partial, external evidence required | `src/lib/live-auth-lifecycle.ts`, `src/lib/live-secret-material-candidates.ts`, `src/lib/live-auth-lifecycle.test.ts`, `src/lib/live-auth-keychain-store.test.ts`, `src/lib/live-auth-disconnect-store.test.ts`, `src/lib/live-auth-secret-reference-encoding.test.ts`, `src/lib/live-auth-secret-reference-identity.test.ts`, `src/lib/live-auth-secret-reference-scope.test.ts`, `src/lib/redaction.ts`, `src/lib/redaction.test.ts`, `src/lib/project-list-codec.ts`, `src/lib/project-list-codec.test.ts`, `docs/live-auth-secret-lifecycle.md`; image API keys are stored only through an injected OS keychain `LiveSecretStore` reference, non-keychain store kinds such as `equivalent_secret_store` are rejected before an image credential can be treated as stored, returned references that echo raw, URL-encoded, base64, base64url, or hex key material are rejected, returned references with unsupported store kinds, store-kind mismatches, wrong service/account scope, blank identity fields, or boundary-whitespace-padded identity fields are rejected, disconnect rejects store-kind mismatch or invalid reference identity before deleting a stored secret reference, project DB serialization redacts raw API keys, `CODEX_SESSION=...`, OAuth identity/session/client secret fields, Bearer/Basic/token Authorization credentials, and `.codex/auth.json` paths before localStorage persistence, auth failures are classified as login-expired/unauthorized/insufficient-permission/organization-verification-required, logout requests cancel active live jobs, and `createLiveAuthLogoutLockState` now returns locked provider statuses so the UI can remain locked after auth disconnect. Local runtime evidence uses `codex-cli 0.141.0` with `codex login status` returning `Logged in using ChatGPT`; regenerated dry-run package `dist/deckforge-macos-dry-run.tgz` has SHA-256 `a9d25b2840b2ae41b15db3ec7dace158748a467febd1643eb46a390028c97272`, 17 app files, 26 archive members, 288,674 compressed bytes, and zero OpenAI/Codex secret-like values or bundled `auth.json`/`.codex` payload files in `dist/client`, `dist/server`, or the extracted app bundle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Fresh login manual QA, logout/relogin QA, and packaged OS keychain bridge QA.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| DF-206 | Closed on GitHub                    | `src/lib/final-export-gate.ts`, `src/lib/final-export-gate.test.ts`, `src/lib/provider-provenance.ts`, `src/components/deck/ExportStagePanels.tsx`, `src/components/deck/ExportStage.integration.test.tsx`, dry-run package scan; closed as completed in `#132` after production contamination blockers exposed artifact ids/upstream paths and development contamination rendered warnings plus a `MOCK MODE` watermark.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | None for DF-206. Real zero-contamination report/export evidence remains tracked by DF-240 and DF-241.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| DF-210 | Partial, external evidence required | Runtime/app-server bootstrap status exists in `src/lib/codex-runtime.ts`; `src/lib/codex-app-server-initialize-smoke.ts` records stdio `initialize`, authenticated health-turn, and crash-restart status; `src/lib/codex-app-server-initialize-evidence.ts` and `src/lib/codex-app-server-initialize-evidence.test.ts` reject initialized evidence with missing protocol identity fields; `src/lib/codex-app-server-health-turn.test.ts` verifies completed health-turn evidence cannot count without durable nonblank thread/turn ids; `src-tauri/src/codex_app_server_smoke.rs`, `src-tauri/src/codex_app_server_protocol.rs`, `src-tauri/src/codex_app_server_session.rs`, `src-tauri/src/codex_app_server_structured_turn.rs`, and `src/lib/desktop-app-server-bridge.ts` now expose desktop Tauri smoke and structured-turn commands plus Zod-parsed TS adapters; `docs/live_text_smoke_report.md` records standalone 0.141.0 install, persistent daemon bootstrap, ChatGPT account read, completed health turn, thread resume, second completed turn, forced daemon crash, daemon restart, post-restart completed turn, and current schema-constrained App Server turn rechecks on threads `019edb32-07eb-7902-85bd-04823b1c47c2` and `019edbdc-61ca-7fc1-9cb4-9146ef9a1237`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Reproduce bootstrap, health turn, restart path, and desktop command invocation on a clean macOS account.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| DF-211 | Closed on GitHub                    | `src/lib/codex-structured-task-runner.ts`, `src/lib/codex-app-server-event-runner.ts`, `src/lib/codex-execution-adapter.ts`, `src/lib/codex-app-server-event-mapper.ts`, `src/lib/codex-app-server-event-mapper.test.ts`, `src/lib/codex-app-server-production-job.ts`, `src/lib/codex-app-server-production-job.test.ts`, `src/lib/desktop-codex-app-server-production-job.ts`, `src/lib/desktop-codex-app-server-production-job.test.ts`, `src/lib/live-text-production-workflow.ts`, `src/lib/live-text-production-workflow.test.ts`, `src-tauri/src/codex_app_server_smoke.rs`, `src-tauri/src/codex_app_server_structured_turn.rs`, `src/lib/desktop-app-server-bridge.ts`, and bridge tests; local tests map App Server progress, approval request, partial output, cancellation, completion, failure, invalid schema events, current nested App Server error notifications, observed JSON-RPC notifications, async production notification streams, desktop smoke command evidence, and desktop structured-turn notifications into Job Manager/UI state while preserving real thread/turn provenance on accepted artifacts; `evaluateStructuredCodexOutput` uses structured payload parsing rather than regex text extraction, rejects partial output as `partial_output_not_approvable`, and rejects schema-invalid completion; `docs/live_text_smoke_report.md` records real protocol-level structured probe thread/turn evidence, including current turn `019edb32-0a20-7812-ba4b-8603beb1b4aa`, goal-continuation turn `019edbdc-6472-7252-a846-334f23436989`, library-level live interview `questions`/`brief` turns `019edc17-b011-74d2-ae54-49842b7abd9d` / `019edc19-d06e-7793-9fbc-80ec053bb9fa`, library-level live Plan/Design/Layout turns `019edbf8-dce2-7a51-90ff-6fdb46137aaa`, `019edbfa-171c-7983-b2b8-33de3ead05f3`, and `019edbfb-55b5-7973-b2e2-a9825d7aa9d4`, and DF-221 live web-search turn `019edc32-6efe-7280-a2c1-47fb1d6b0ebf` also flowed through the same production Job Manager provenance path; issue `#134` is closed as completed with `status:done`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | None for DF-211 common runner acceptance. Packaged production UI full text artifact persistence remains tracked by DF-213, DF-214, and DF-215.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| DF-212 | Partial, external evidence required | `src/lib/project-thread-lifecycle.ts`, `src/lib/project-thread-lifecycle.test.ts`, `src/lib/project-thread-stale-context-hash.test.ts`, `src/lib/project-thread-worker-identity.test.ts`, `src/lib/project-thread-raw-source.ts`, `src/lib/project-thread-raw-source.test.ts`, `src/lib/deck-context.ts`, `src/lib/project-thread-resume-evidence.ts`, `src/lib/project-thread-resume-evidence.test.ts`, `src/lib/project-thread-resume-lineage.test.ts`, `src/lib/project-thread-resume-turn-identity.test.ts`, `docs/live-project-thread-lifecycle.md`; each worker now carries the shared `deckContextId`, `deckContextHash`, approved artifact bundle, and last completed turn id, manifests reject a missing coordinator thread id, duplicate worker threads for the same stage, blank worker thread ids, duplicate worker thread ids, worker threads that reuse the coordinator thread id, and raw conversation source-of-truth contamination through `sourceOfTruth: "raw_conversation"`, nested worker resume/source metadata, or persisted transcript fields, active stale live jobs are detected after upstream invalidation by context id and by context-hash drift under the same context id, restart recovery restores persisted coordinator/worker thread IDs only when the current context hash and artifact bundle still match, and the new resume-evidence gate requires a recovered worker thread, matching context hash/artifact bundle, recovered previous turn id, completed new canonical resumed turn, and App Server process recreation. A library-level live App Server recheck resumed worker thread `019edc28-bf27-7380-b7d2-65405e6c6758` from pre-restart turn `019edc28-c179-7453-a5a5-c87e29096422` to resumed turn `019edc28-f9ec-72e1-9695-1a9a2c2ca61d` after process recreation; `evaluateProjectThreadResumeEvidence` returned `ready`, mismatched previous-turn claims block as `resume_previous_turn_not_recovered`, non-canonical resumed turn ids block as `resume_next_turn_not_canonical`, and whitespace-padded reuse of the recovered turn blocks as `resume_reused_existing_turn`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Packaged desktop restart/reopen run that persists the manifest through app storage and invokes the resumed production UI worker thread.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| DF-213 | Partial, external evidence required | `src/lib/live-interview-cutover.ts`, `src/lib/live-interview-provenance.ts`, `src/lib/live-interview-question-input.test.ts`, `src/lib/live-interview-artifact-identity.test.ts`, `src/lib/live-interview-cutover.test.ts`, `src/lib/live-interview-cutover-prompt-version.test.ts`, `src/lib/live-interview-answer-map.ts`, `src/lib/live-interview-answer-map.test.ts`, `src/lib/live-text-artifact-record.ts`, `src/lib/live-text-turn-artifacts.ts`, `src/lib/live-text-artifact-persistence.ts`, `src/lib/live-text-artifact-persistence.test.ts`, `src/lib/live-text-production-workflow.ts`, `src/lib/live-text-production-workflow.test.ts`, `src/lib/production-text-workflow-gate.ts`, `src/lib/production-text-workflow-gate.test.ts`, `src/lib/desktop-app-server-bridge.ts`, `src/lib/desktop-app-server-bridge.test.ts`, `src/lib/desktop-codex-app-server-production-job.ts`, `src/lib/desktop-codex-app-server-production-job.test.ts`, `src/lib/desktop-live-interview-workflow.ts`, `src/lib/desktop-live-interview-jobs.ts`, `src/lib/desktop-live-interview-workflow.test.ts`, `src/components/deck/ProductionTextWorkflowPanel.tsx`, `src/components/deck/ProductionTextWorkflowLauncher.tsx`, `src/components/deck/ProductionTextWorkflowPanel.integration.test.tsx`, `docs/live-interview-cutover.md`; interview question and Brief artifacts require production Codex provenance, separate question/Brief turns, separate question/Brief artifact ids (`brief_reused_question_artifact`), interview-specific prompt versions, question artifact project/initial-prompt input lineage (`question_missing_project_input`), follow-up turn scheduling, no fixture fallback, accepted-output persistence, production App Server job orchestration before persistence, desktop smoke/structured-turn bridge adapters, App Server strict nested `questions` and `brief` response schemas, draft-Brief answer handoff into the production launcher, an app-level desktop interview launcher that stores the live question artifact when follow-up is required and can continue to a live Brief patch when answers are present, a library-level live run that persisted `p_goal_live_interview_20260619_fixed_2_questions_live` from thread `019edbeb-0963-7de1-a9e6-654f708a5637` / turn `019edbeb-0baf-71e3-85be-a4c331202d4b` with eight follow-up questions, and a second library-level live run that persisted ready `questions`/`brief` artifacts `p_goal_live_interview_20260619_brief_questions_live` / `p_goal_live_interview_20260619_brief_brief_live` from turns `019edc17-b011-74d2-ae54-49842b7abd9d` / `019edc19-d06e-7793-9fbc-80ec053bb9fa` with Brief input lineage. | Production interview workflow must record authenticated follow-up/Brief turns from the packaged production UI and store the complete real live artifact bundle, including question artifact input ids that cite the project or initial prompt artifact.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| DF-214 | Partial, external evidence required | `src/lib/live-text-pipeline-cutover.ts`, `src/lib/live-text-pipeline-provenance.ts`, `src/lib/live-text-pipeline-cutover.test.ts`, `src/lib/live-text-pipeline-auth.test.ts`, `src/lib/live-text-pipeline-input-identity.test.ts`, `src/lib/live-text-pipeline-cutover-test-fixtures.ts`, `src/lib/live-text-artifact-record.ts`, `src/lib/live-text-turn-artifacts.ts`, `src/lib/live-text-artifact-persistence.ts`, `src/lib/live-text-artifact-persistence.test.ts`, `src/lib/live-text-production-workflow.ts`, `src/lib/live-text-production-workflow.test.ts`, `src/lib/production-text-workflow-gate.ts`, `src/lib/production-text-workflow-gate.test.ts`, `src/lib/desktop-app-server-bridge.ts`, `src/lib/desktop-app-server-bridge.test.ts`, `src/lib/desktop-codex-app-server-production-job.ts`, `src/lib/desktop-codex-app-server-production-job.test.ts`, `src/lib/desktop-live-text-pipeline-workflow.ts`, `src/lib/desktop-live-text-pipeline-jobs.ts`, `src/lib/desktop-live-text-pipeline-output-schemas.ts`, `src/lib/desktop-live-text-pipeline-workflow.test.ts`, `src/components/deck/ProductionTextWorkflowPanel.tsx`, `src/components/deck/ProductionTextWorkflowLauncher.tsx`, `src/components/deck/ProductionTextWorkflowPanel.integration.test.tsx`, `docs/live-text-pipeline-cutover.md`; Deck Plan, Design System, and Layout IR require separate production Codex turn provenance, separate persisted artifact ids (`shared_live_artifact`), canonical approved Brief plus approved Live Research Pack artifact input lineage (`missing_brief_input` / `missing_research_input` / `noncanonical_text_pipeline_input_identity`), stage-correct prompt versions, schema-valid markdown/JSON output, repair limits, component-catalog Layout IR, shared context consistency, accepted-output persistence, production App Server job orchestration before persistence, desktop smoke/structured-turn bridge adapters, App Server strict response schemas for all three stage jobs, an app-level desktop launcher that runs the three structured turns before persistence, and a production UI gate/button that exposes `deck_plan`/`design_system`/`layout_ir` stages plus upstream and bridge blockers; a library-level live run persisted Deck Plan artifact `p_live_text_pipeline_20260619_deck_plan_live`, Design System artifact `p_live_text_pipeline_20260619_design_system_live`, and Layout IR artifact `p_live_text_pipeline_20260619_layout_ir_live` from real App Server turns.                                                                                                                                                                                  | Production Plan/Design/Layout workflow must record authenticated Codex turns from the packaged production UI and store real live artifact bundles plus schema repair evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| DF-215 | Partial, external evidence required | `docs/live_text_smoke_report.md` records an authenticated CLI, generated protocol schemas, successful stdio initialize smoke, persistent daemon bootstrap, App Server health turn, resumed second turn, post-restart health turn, schema-constrained structured probe turns with live thread/turn ids and `mock:false` / `fixture:false` output, including current thread `019edb32-07eb-7902-85bd-04823b1c47c2`, current turn `019edb32-0a20-7812-ba4b-8603beb1b4aa`, goal-continuation thread `019edbdc-61ca-7fc1-9cb4-9146ef9a1237`, goal-continuation turn `019edbdc-6472-7252-a846-334f23436989`, library-level live interview workflow turns `019edc17-b011-74d2-ae54-49842b7abd9d` and `019edc19-d06e-7793-9fbc-80ec053bb9fa`, and library-level live text pipeline turns `019edbf8-dce2-7a51-90ff-6fdb46137aaa`, `019edbfa-171c-7983-b2b8-33de3ead05f3`, and `019edbfb-55b5-7973-b2e2-a9825d7aa9d4`, plus desktop Tauri smoke and structured-turn commands with TS bridge adapters; `src/lib/live-text-production-workflow.test.ts` verifies the local production text workflow runs App Server jobs before persistence, `src/lib/desktop-codex-app-server-production-job.test.ts` verifies desktop structured-turn notifications flow into production Job Manager provenance, `src/lib/desktop-live-interview-workflow.test.ts` verifies strict response schemas and the ready interview app launcher calling question and Brief turns before persistence, `src/lib/desktop-live-text-pipeline-workflow.test.ts` verifies strict response schemas and the ready Plan/Design/Layout app launcher calling three desktop structured turns before persistence, and `src/lib/live-text-smoke-gate.test.ts` verifies a full smoke bundle cannot pass with missing stages, mock/fixture artifacts, missing turn ids, missing completed post-resume turns, or post-resume thread ids that do not match the previous text artifact turn.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Run the complete DeckForge production text pipeline from interview through Layout IR with authenticated live Codex-only artifacts from the packaged app surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| DF-220 | Closed on GitHub                    | `src/lib/research-live-network-policy.ts`, `src/lib/research-live-network-policy.test.ts`, `src/lib/research-source-fetcher.ts`, `src/lib/research-source-fetcher.test.ts`, `src/components/deck/ProductionWorkflowStage.tsx`, `src/components/deck/ProductionResearchNetworkPolicy.tsx`, `src/components/deck/ProductionWorkflowStage.integration.test.tsx`, `docs/live-research-network-policy.md`; closed as completed in `#139` after the production Research surface rendered the policy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | None for DF-220. Live search execution evidence remains tracked by DF-221; source capture evidence remains tracked by DF-222.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| DF-221 | Closed on GitHub                    | `src/lib/live-web-search-evidence.ts`, `src/lib/live-web-search-evidence.test.ts`, `src/lib/research-pack-web-search.test.ts`, `src/lib/desktop-live-web-search-jobs.ts`, `src/lib/desktop-live-web-search-workflow.ts`, `src/lib/desktop-live-web-search-workflow.test.ts`, `src/components/deck/ProductionResearchWebSearchLauncher.tsx`, `src/components/deck/ProductionResearchWebSearchLauncher.integration.test.tsx`, `ResearchPack.webSearchEvidence`, `docs/live-web-search-evidence.md`; cached/mock candidates, missing metadata, query/event-log mismatches, insufficient live domains, and cached-only latestness benchmarks are locally blocked, the search event log is preserved with Research Pack artifacts, and the production Research step has an app-level desktop `web_search` launcher that stores live candidates plus production Codex provenance. The first live repro removed the unsupported `format: "uri"` response-schema blocker and exposed timeout turn `019edc05-daa6-7a52-abed-358f8c7912aa`; the rerun completed thread `019edc32-6c92-7371-b34d-e6e7858253db` and turn `019edc32-6efe-7280-a2c1-47fb1d6b0ebf` in 315,804 ms with six live candidates, six distinct domains, live latestness benchmark, production Codex provenance, `fixture:false`, and zero DF-221 evidence blockers; issue `#140` is closed as completed with `status:done`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | None for DF-221 worker acceptance. Packaged Golden Path research/source capture, evidence extraction, approval QA, and release validation remain tracked by DF-222, DF-223, DF-224, DF-241, and DF-247.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| DF-222 | Closed on GitHub                    | `docs/live-source-capture-bundle.md`, `docs/live-source-capture-bundle/`, `src/lib/research-source-fetcher.ts`, `src/lib/research-source-fetcher.test.ts`, `src/lib/research-source-capture-bundle.ts`, `src/lib/research-source-capture-bundle.test.ts`, `src/lib/research-pack-source-capture-history.test.ts`, `src/lib/live-readiness-research-doc.test.ts`; closed as completed in `#141` after the evidence bundle recorded 2 successful HTML captures, 1 successful PDF capture, a retained failed candidate, URL/fetch/MIME/status/hash/archive metadata, original files plus extracted text, failure classification, and an `html_001` v2 recapture with raw/text hash change flags.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | None for DF-222. Production Research Pack consumption of source capture/evidence remains tracked by DF-223 and DF-224.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| DF-223 | Partial, external evidence required | `src/lib/live-research-evidence.ts`, `src/lib/live-research-source-artifact-evidence.ts`, `src/lib/live-research-evidence-ref-targets.ts`, `src/lib/live-research-evidence-pack-requirements.ts`, `src/lib/live-research-source-artifact-evidence.test.ts`, `src/lib/live-research-number-evidence.ts`, `src/lib/live-research-evidence.test.ts`, `src/lib/live-research-evidence-ref-targets.test.ts`, `src/lib/live-research-number-evidence.test.ts`, `src/lib/live-research-evidence-builder.ts`, `src/lib/live-research-evidence-builder.test.ts`, `src/lib/live-research-pack-builder.ts`, `src/lib/live-research-pack-builder.test.ts`, `src/lib/deck-plan-prompt.ts`, `src/lib/deck-plan-prompt.test.ts`, `ResearchPack.liveEvidenceRefs`, existing `research-orchestrator` and `research-validator` gates; DF-222 source capture bundle is available locally, packs with no dataset and no numeric evidence now fail with `missing_dataset_or_numeric_evidence`, dataset-backed major numbers require unit/period/geography/definition metadata, captured source artifact metadata can now generate quote/table evidence refs before approval, persisted evidence refs must target existing claims, carry unique ids, and name a source with persisted `capture.rawArchivePath` matching the evidence path or fail with `unknown_reference`/`duplicate_evidence_reference`/`missing_source_artifact`/`source_artifact_mismatch`, production review displays persisted evidence references, and direct Deck Plan prompt construction excludes live claims from Usable Research Claims when `ResearchPack.liveEvidenceRefs` is present but lacks original quote/table evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Generate and review an authenticated packaged-app live Research Pack with app-produced evidence references.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| DF-224 | Partial, external evidence required | `src/lib/live-research-approval-gate.ts`, `src/lib/live-research-source-capture-gate.ts`, `src/lib/live-research-approval-action.ts`, `src/lib/live-research-approval-action.test.ts`, `src/lib/research-review-actions.ts`, `ResearchPack.sources[].capture`, `ResearchPack.provenanceLineage`, `src/components/deck/ResearchSourcePreview.tsx`, `src/components/deck/ResearchSourceEvidencePreview.tsx`, `src/components/deck/ProductionResearchReview.tsx`, `src/components/deck/ProductionWorkflowStage.tsx`; source capture completeness, provider provenance, DF-223 evidence, and pending reinforcement gates can block approval, while production displays actual URL, source type, `fetched_at`, quote/table evidence, claim confidence, persisted blockers, source exclusion/reinforcement controls, source-exclusion cleanup for stale persisted live evidence refs, review-mutation cleanup for stale provider provenance, saved evidence/provenance inputs, and enables approval only when `approvedResearchPackHash` is safe for DF-214. The deck-plan handoff helper returns no handoff for stale approved hashes or approved hashes whose persisted evidence/provenance fail the live gate, so approval cannot be replayed after source, evidence, review, or provenance changes. Research Pack provenance must name both the exact canonical current artifact id and a `live_research_pack@...` prompt version, preventing another live stage prompt from unlocking approval. The ready approval action creates an approved research artifact record at `projects/{projectId}/research/research.v{version}.json` and passes that record into the approval log so the DF-214 handoff is auditable by artifact id/version/path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Manual approval QA with app-produced live sources, evidence refs, and provider provenance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| DF-230 | Closed on GitHub                    | `src/lib/image-provider-feasibility.ts`, `src/lib/image-path-decision.ts`, `src/lib/image-path-decision-provenance.ts`, `src/lib/image-path-decision-test-fixtures.ts`, `src/lib/image-artifact-path.ts`, `src/lib/image-path-decision-artifact-paths.ts`, `src/lib/image-path-decision-request-model.test.ts`, `src/lib/image-path-decision-slide-path.test.ts`, `src/lib/image-path-decision-provenance.test.ts`, `src/lib/image-path-decision-prompt-provenance.test.ts`, `src/lib/production-image-generation-gate.ts`, `src/components/deck/GenerateStage.tsx`, and fallback copy; image path locking now requires setup readiness, Codex image capability readiness, account usage owner, required permissions, provider-route match, nonblank request model match, PNG-signature binary output, nonblank Codex turn/thread ids, versioned binary/provenance storage paths whose `slide_###` and version match the successful artifact, and provider provenance sidecar content that matches production execution, selected provider, selected auth mode, selected model, selected prompt version, non-fixture status, and turn/thread ids while keeping `fixtureFallbackAllowed: false`; the Generate stage blocks production image generation with `missing_image_path_decision` or `image_path_not_locked` until the locked decision is present on the project, while `mock` remains development-only, and the production gate revalidates persisted locked decisions so fixture fallback flags, blank or padded Codex turn/thread ids, padded persisted binary/provenance paths, non-versioned paths, or binary/provenance sidecar drift cannot pass after project reload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | None for DF-230. Closed in #144 after Lane B stored a real Codex OAuth route-lock PNG plus metadata and provenance sidecars.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| DF-231 | Closed on GitHub                    | `src/lib/slide-image-provider.ts`, `src/lib/slide-image-provider-contract.ts`, `src/lib/live-image-provider-adapter.ts`, `src/lib/live-image-provider-adapter-live-provider.test.ts`, `src/lib/image-provider-errors.ts`, `src/lib/image-artifact-store.ts`, `src/lib/image-artifact-store-live-provider.ts`, `src/lib/image-artifact-store-usage.test.ts`, `src/lib/image-artifact-store-lineage.test.ts`, `src/lib/image-artifact-store-live-provider.test.ts`; provider prompt/layout request metadata is preserved, the Codex image provider records App Server image output with turn/thread provenance, the live adapter rejects mock providers before generation, stores successful provider bytes as versioned artifacts, and writes binary, metadata, and provider provenance sidecars while avoiding writes on classified provider failures, provider/artifact lineage mismatches fail with non-retryable `provider_contract` before storage, errors are classified by auth/quota/rate-limit/content-policy/provider-contract/server class, retryability is transient-only, stored image bytes now require a PNG signature, mock image artifacts are rejected before live storage writes, Codex image artifacts with missing or blank turn/thread ids are rejected before writes, project ids must be safe storage segments before artifact writes, slide numbers and artifact versions must be positive integers before versioned paths are written, prompt id/version/hash and layout screenshot lineage must be canonical nonblank before writing provenance, request usage counts must be non-negative integers before writes, and stored binary hashes are real 64-character SHA-256 digests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | None for DF-231. Closed in #145 after Lane B persisted real Codex OAuth provider bytes and turn metadata through the artifact store.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| DF-232 | Closed on GitHub                    | `src/lib/live-background-batch.ts`, `src/lib/live-background-batch-storage.ts`, `src/lib/live-background-batch-integrity.ts`, `src/lib/live-background-batch-text-overlay.ts`, `src/lib/live-background-batch.test.ts`, `src/lib/live-background-batch-storage-path.test.ts`, `src/lib/live-background-batch-uniqueness.test.ts`, `src/lib/live-background-batch-request-model.test.ts`, `src/lib/live-background-batch-provenance.test.ts`, `src/lib/live-background-batch-text-overlay.test.ts`, and `designSystemId` propagation through slide context, prompt packages, and generation queue; the five-background validator now also rejects missing or mismatched prompt package and stored background artifact evidence matched by slide id rather than array order, fake PNG payloads, missing or blank provider turn/model metadata, stored metadata/provenance turn or model/runtime values that diverge from the live artifact request, stored provider provenance sidecars whose artifact id, production execution mode, provider/auth mode, prompt version, input artifact ids, or duration drift from the stored binary and live artifact, stored binary paths outside versioned project image storage, duplicate provider turn ids, duplicate stored artifact ids/paths/hashes, and prompt packages whose structured text overlay strategy no longer reserves text/data overlays or carries the exact no-text/no-invent rules, in addition to mock output, context/design mismatch, wrong aspect ratio, slide id mismatch, layout reference mismatch, and missing text overlay rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | None for DF-232. Closed in #146 after Lane B generated five distinct live Codex OAuth background artifacts and validated the batch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| DF-233 | Partial, external evidence required | `src/lib/slide-generation-queue.ts`, `src/lib/slide-generation-queue-executor.ts`, `src/lib/slide-generation-queue-types.ts`, `src/lib/slide-generation-retry-policy.ts`, `src/lib/live-image-queue-evidence.ts`, `src/lib/live-image-queue-cancellation.ts`, `src/lib/live-image-queue-retry-slide.ts`, `src/lib/slide-generation-queue-live-controls.test.ts`, `src/lib/slide-generation-queue-resume-lineage.test.ts`, `src/lib/slide-generation-queue-cancellation-backoff.test.ts`, `src/lib/live-image-queue-evidence.test.ts`, `src/lib/live-image-queue-cancel-attempt.test.ts`, `src/lib/live-image-queue-cancelled-job.test.ts`, `src/lib/live-image-queue-retry-slide.test.ts`; queue execution limits concurrency, skips only `ready` or `approved` completed slides whose descriptors exactly match the current live image descriptor including provider, 16:9 aspect, layout reference, and `slide_generation@v1` prompt lineage on partial resume while regenerating stale prompt-lineage, stale layout, unfinished `pending`, or `generating` entries, records cancellation as failed slide/job provenance, applies bounded backoff for `rate_limit`, preserves `retryProvenance` even when a retried slide eventually succeeds, directly verifies max-attempt `server` retry provenance, prevents a cancellation during retry backoff from starting or counting another provider attempt, discards in-flight provider output when user cancellation is requested before completion, and now rejects retry evidence whose bundle or slide number differs from the retried job output/failure plus cancellation evidence whose failed slide bundle or attempt count differs from the recorded slide-generation prompt usage bundle and cancelled provider job, or whose cancelled provider job has no matching slide failure evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Live throttling, cancellation, and partial resume QA against real provider artifacts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| DF-234 | Partial, external evidence required | `src/lib/final-slide-compositor.ts`, `src/lib/final-slide-compositor.test.ts`, `src/lib/final-slide-compositor-storage-path.test.ts`, `src/components/deck/review-gallery-model.ts`, `src/components/deck/review-gallery-compositor-svg.ts`, `src/components/deck/review-gallery-model.test.ts`, `src/components/deck/review-gallery-overlay-bounds.test.ts`, `src/components/deck/ReviewGalleryPanel.tsx`, `src/components/deck/ReviewGallery.integration.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Local review now carries stored background artifact id/path/hash into compositor output, rejects cross-slide stored background artifact references at both compositor and review validation boundaries, rejects malformed stored hashes, stored background refs outside versioned project image storage, and artifact id/path version drift at the compositor boundary, rejects compositor SVG output that omits the same stored background artifact id/path/hash, rejects reused stored background artifact ids/paths/hashes across review items, renders five thumbnails plus the selected presentation preview, blocks missing or malformed stored image artifact hashes, rejects non-image live providers and fake compositor preview PNGs, requires positive in-canvas editable overlay bounds for title/body/chart/source, and keeps collision blockers; still needs live compositor screenshots from real image artifacts and title edit/re-export QA.                                                                                                                                                                                                |
| DF-235 | Partial, external evidence required | `src/lib/live-slide-regeneration.ts`, `src/lib/live-slide-regeneration-request-validation.ts`, `src/lib/live-slide-regeneration-candidate.ts`, `src/lib/live-slide-regeneration-slide-spec.ts`, `src/lib/live-slide-regeneration.test.ts`, `src/lib/live-slide-regeneration-request-validation.test.ts`, `src/lib/live-slide-regeneration-approved-original.test.ts`, `src/lib/live-slide-regeneration-version.test.ts`, `src/lib/live-slide-regeneration-slide-spec.test.ts`, existing revision request/generation model and compare panel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Local regeneration requests now require an approved selected original slide, nonblank edit instructions, non-empty, non-blank, non-duplicated, non-overlapping `mustKeep`/`mustChange`, original artifact id, and original original provider turn id; candidates preserve original artifact id plus original original provider turn id, reject different selected slides, stale approved-original versions, and stale candidate slide specs whose number/hash differ from the approved request `slideSpecHash`, require a new versioned background artifact whose id/path/metadata version and exact storage paths match the candidate slide version, require regenerated regenerated provider turn evidence that is consistent across metadata/provenance and distinct from the approved original turn id, require production `codex` Codex-session non-fixture provenance, preserve the approved original on failure, and block approval unless before/after comparison evidence matches the candidate and all preserved-target checks are kept; still needs Live full-slide regeneration before/after QA with real provider artifacts.                                                                                                                                           |
| DF-240 | Partial, external evidence required | `src/lib/live-generation-report-lineage.ts`, `src/lib/live-generation-report-text-prompt.ts`, `src/lib/live-generation-report-lineage-secret.ts`, `src/lib/live-generation-report-reference-uniqueness.ts`, `src/lib/live-generation-report-slide-coverage.ts`, `src/lib/final-export-live-report-gate.ts`, `src/lib/final-export-report-gate.ts`, `src/lib/live-report-provider-link.ts`, `src/lib/live-generation-report-lineage.test.ts`, `src/lib/final-export-gate-live-lineage-auth.test.ts`, `src/lib/final-export-gate-live-lineage-text-prompt.test.ts`, `src/lib/generation-report.ts`, `src/lib/final-export-gate.ts`, `src/lib/final-export-gate.test.ts`, `src/lib/final-export-gate-live-lineage.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Production export now requires slide-level live report lineage for every project slide, rejects duplicate slide rows, reused text turn ids, and reused image turn ids, requires nonblank source ids with no blank or duplicate source entries, text turn/thread ids, text prompt version, image turn ids, and full text/image artifact ids, requires report text/image artifact ids to exist in provider provenance, rejects unauthenticated provider provenance plus text prompt, turn/request metadata mismatches, requires versioned image artifact ids matching their reported slide numbers, full SHA-256 compositor/export hashes, rejects sidecar lineage fields and exported project content that leak raw secrets or retain mock-mode/fixture markers, blocks generation report markdown that leaks raw secrets, and forwards incomplete/contaminated lineage blockers; report must still be populated by a real zero-contamination lineage from production text turns, image turns, and compositor-matched exports.                                                                                                                                |
| DF-241 | Blocked by upstream Live evidence   | `src/lib/live-release-gate.ts`, `src/lib/live-golden-path-e2e.ts`, `src/lib/live-golden-path-e2e-contract.ts`, `src/lib/live-golden-path-e2e-evidence.ts`, `src/lib/live-golden-path-evidence-path.ts`, `src/lib/live-golden-path-source-evidence.ts`, `src/lib/live-real-source-url.ts`, `src/lib/live-golden-path-e2e-validation.ts`, `src/lib/live-evidence-path.ts`, `src/lib/live-golden-path-e2e.test.ts`, `src/lib/live-golden-path-source-url-evidence.test.ts`, `src/lib/live-golden-path-step-order.test.ts`, `src/lib/live-golden-path-report-signature-timestamp.test.ts`, `src/lib/live-golden-path-local-path-evidence.test.ts`, `src/lib/live-golden-path-template-evidence.test.ts`, `src/lib/live-golden-path-validation-bundle-path.test.ts`, `src/lib/live-golden-path-validation-bundle-extra-reference.test.ts`, `src/lib/live-golden-path-restart-reopen-timestamp.test.ts`, `src/lib/live-golden-path-image-request-uniqueness.test.ts`, `src/lib/live-golden-path-regeneration-image.test.ts`, `src/lib/live-golden-path-image-auth-evidence.test.ts`, `src/lib/live-golden-path-image-model-evidence.test.ts` encode Golden Path prerequisites and evidence bundle blockers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Local evidence gate now verifies signed report parseable timestamp and digest matching, canonical Golden Path step order, per-step screenshots, non-synthetic, non-local, non-template/sample/example/placeholder report/screenshot/recording/final validation bundle paths plus manifest consistency for export id, report digest, screenshots, recording, source artifact ids, and nonblank live image artifact ids, requires restart/reopen evidence with a parseable timestamp and matching project/export ids, rejects duplicate or unexpected final validation bundle references, rejects duplicate normalized source URLs/artifact ids and placeholder/reserved/local/private source URLs before counting the three required sources, and rejects blank, unauthenticated, model/prompt-missing, duplicate live image artifact ids, or duplicate provider turn ids before counting the five required images; still needs signed `live_e2e_report.md`, screenshots/recording, final validation bundle, and real provider Golden Path run.                                                                                                               |
| DF-242 | Blocked by upstream Live evidence   | `src/lib/live-benchmark-evidence.ts`, `src/lib/live-benchmark-evidence-path.ts`, `src/lib/live-benchmark-failure-domain.ts`, `src/lib/live-benchmark-golden-path-evidence.ts`, `src/lib/live-benchmark-package-hash.ts`, `src/lib/live-benchmark-output-bundle.ts`, `src/lib/live-benchmark-screenshot-evidence.ts`, `src/lib/live-benchmark-output-bundle-duplicates.ts`, `src/lib/live-benchmark-output-artifact-duplicates.ts`, `src/lib/live-evidence-path.ts`, `src/lib/live-benchmark-output-bundle-path.test.ts`, `src/lib/live-benchmark-report-path-evidence.test.ts`, `src/lib/live-benchmark-evidence.test.ts`, `src/lib/live-benchmark-failure-domain.test.ts`, `src/lib/live-benchmark-scenario-uniqueness.test.ts`, `src/lib/live-benchmark-scenario-report-uniqueness.test.ts`, `src/lib/live-benchmark-screenshot-evidence.test.ts`, `src/lib/live-benchmark-output-bundle-counts.test.ts`, `src/lib/live-benchmark-image-request-evidence.test.ts`, `src/lib/live-benchmark-regeneration-image-evidence.test.ts`, `src/lib/live-benchmark-artifact-contamination.test.ts`, `src/lib/live-benchmark-template-evidence.test.ts`, `src/lib/live-benchmark-export-artifact-uniqueness.test.ts`, `src/lib/live-benchmark-cross-run-artifact-uniqueness.test.ts`, `docs/live-benchmark-report.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Local benchmark gate now rejects unknown or duplicate benchmark scenarios, duplicate output bundles, duplicate scenario report paths, top-level benchmark report paths outside exact `docs/live-benchmark-report.md`, synthetic, observer-template, or developer-local output bundle/report paths, synthetic or observer-template source/image/request/regeneration/export artifact ids, passed runs that retain failure domains, unsupported failure-domain taxonomy values, missing, malformed, or non-canonical uppercase benchmark package SHA evidence, output bundles from a different package candidate, evidence count/list mismatches, and output bundle manifests missing benchmark id/path consistency, non-synthetic, non-local scenario reports, distinct final export artifact ids, cross-run Golden Path report/screenshot/source/image/request evidence reuse, non-synthetic, non-local Golden Path report evidence, distinct screenshot paths, distinct source artifact ids, five distinct initial live image artifact ids, one separate approved regenerated live image artifact id, or distinct live image turn ids; still needs five non-synthetic, non-local live benchmark output bundles and four passing named real provider Golden Path runs. |
| DF-243 | Partial, external evidence required | `src/lib/live-interruption-matrix.ts`, `src/lib/live-interruption-image-resume.ts`, `src/lib/live-interruption-evidence-details.ts`, `src/lib/live-interruption-report-path.ts`, `src/lib/live-interruption-matrix.test.ts`, `src/lib/live-interruption-scenario-uniqueness.test.ts`, `src/lib/live-interruption-image-resume.test.ts`, `src/lib/live-interruption-image-artifact-identity.test.ts`, `src/lib/live-interruption-state-taxonomy.test.ts`, `src/lib/live-interruption-gate-evidence-uniqueness.test.ts`, `src/lib/live-interruption-report-path.test.ts`, `src/lib/provider-job-recovery.ts`, `src/lib/project-thread-lifecycle.ts`; local interruption gates now require exact scenario coverage with no unknown rows and distinct non-synthetic live job ids and recovery snapshot paths, persisted non-synthetic, non-developer-local recovery snapshots, non-synthetic, non-developer-local matrix report paths, runtime-valid recovered job states, app-storage cancel snapshots, persisted non-developer-local cancel signal JSON paths tied to the same live job id rather than boolean-only cancellation flags, distinct persisted interrupted approval/export gate JSON evidence paths rather than boolean-only or reused-path gate checks, safe recovered text/fetch states, preserved completed artifacts, no new text/fetch artifacts after interrupted restart recovery, safe image partial-resume whose resumed image ids are nonblank, non-duplicated, and come only from the pending set, stopped cancelled jobs, and no new completed artifacts after cancellation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Still needs a real live interruption matrix against authenticated text, fetch, and image jobs, including live image partial-resume, app-level persisted cancel snapshots, and interrupted approval/export scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| DF-244 | Partial, external evidence required | `src/lib/live-usage-summary.ts`, `src/lib/live-usage-summary-format.ts`, `src/lib/live-usage-stage-identity.ts`, `src/lib/live-usage-summary.test.ts`, `src/lib/live-usage-summary-duration-evidence.test.ts`, `src/lib/live-usage-summary-stage-identity.test.ts`, `src/lib/live-usage-summary-billing-evidence.test.ts`, `src/lib/live-usage-summary-cost-label.test.ts`, `src/lib/live-usage-summary-redaction.test.ts`, `src/lib/live-app-server-usage-summary.ts`, `src/lib/provider-job-progress-view.ts`, `src/lib/provider-job-progress-view.test.ts`, `src/lib/provider-job-progress-view-redaction.test.ts`, `src/lib/audit-log.ts`, `ProviderUsageSummary`, job progress/report surfaces; live `codex app-server --stdio` usage probe completed turn `019edc53-3bfe-76d3-912d-31769ee3fd3f` on thread `019edc53-3950-74e1-8287-36d66f29e87e`, observed `thread/tokenUsage/updated`, and mapped 25,006 input tokens plus 141 output tokens into a ready DF-244 text usage stage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Local formatted-summary, progress-panel, and report/audit formatting now label `estimatedCostUsd` as `cost estimate`, preserve confirmed Codex image usage disclosure labels only with persisted `confirmationEvidencePath` JSON evidence and user confirmation, redact secret-like usage label text before summary/progress/report display, render unconfirmed or evidence-less confirmed-looking Codex image usage payloads as not confirmed , reject blank or duplicated stage ids, unsupported runtime provider kinds, zero-duration stage latency evidence, invalid usage/cost amounts, and unsupported runtime cost labels, omit invalid provider payload amounts from the visible app progress usage list, block empty provider-supplied usage objects, block incomplete Codex input/output token pairs, block image usage evidence without image counts, and block estimated provider costs labelled as actual charges; still needs packaged app usage-summary manual QA with real provider image Codex usage payloads.                                                                                                                                                                    |
| DF-245 | Partial, external evidence required | `src/lib/production-packaging-evidence.ts`, `src/lib/production-packaging-clean-machine.ts`, `src/lib/production-packaging-evidence.test.ts`, `src/lib/production-packaging-clean-machine-steps.test.ts`, `src/lib/production-packaging-clean-machine-taxonomy.test.ts`, `scripts/package-path-sanitizer.mjs`, `docs/production-clean-machine-runbook.md`, local dry-run package scan covering mock, fixture, test, secret, local absolute path contamination, package SHA-256 evidence, native macOS bundle SHA-256 evidence, non-synthetic/non-local package archive and native bundle evidence paths, canonical clean-machine runbook path evidence, distinct clean-machine step labels plus persisted step evidence paths without duplicate, reused-path, or unsupported-step inflation, and native release trust checks that reject missing, placeholder, malformed, or boundary-whitespace-padded Developer ID TeamIdentifier evidence, missing, synthetic, developer-local, or generically named persisted `releaseTrustEvidencePath` JSON bundles, missing notarization/stapling, and Gatekeeper rejection; latest regenerated dry-run archive `dist/deckforge-macos-dry-run.tgz` on lane branch `jacobex/live-lane-release-qa` has SHA-256 `a9d25b2840b2ae41b15db3ec7dace158748a467febd1643eb46a390028c97272`, 17 app files, 26 archive members, 288,674 compressed bytes, and scan hits only expected redaction guard literals, sensitive-path guards, Tailwind/class-merge CSS utility identifiers, and status copy. Latest `bun run tauri:build` produced native DMG `release-artifacts/DeckForge_0.1.0_aarch64.dmg` with SHA-256 `53428ab9cf805a85c41e775bc2107d9e58713e0b7234ede271c0ead9560f932b`, 1,833,569 bytes, mounted-DMG scan with 0 secret-like and 0 contamination hits, and explicit blocker evidence that the app is ad-hoc signed and Gatekeeper rejects the DMG with `source=no usable signature`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Fresh macOS account clean-machine validation, Developer ID signing, notarization, stapling, Gatekeeper acceptance, and persisted release-trust assessment bundle capture.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| DF-246 | Blocked by upstream Live evidence   | `src/lib/live-manual-qa-evidence.ts`, `src/lib/live-manual-qa-approval-targets.ts`, `src/lib/live-manual-qa-issue-log.ts`, `src/lib/live-manual-qa-session-evidence.ts`, `src/lib/live-manual-qa-counts.ts`, `src/lib/live-manual-qa-source-evidence.ts`, `src/lib/live-manual-qa-evidence.test.ts`, `src/lib/live-manual-qa-approval-targets.test.ts`, `src/lib/live-manual-qa-session-evidence.test.ts`, `src/lib/live-manual-qa-source-evidence.test.ts`, `docs/live-manual-qa-checklist.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Validator now rejects developer self-test evidence, missing, synthetic, generic/non-session, template/sample/example/placeholder, developer-local absolute, or `file://` `sessionEvidencePath` bundles, non-URL, placeholder, reserved-documentation, private-network, or local source-open evidence, opened source URLs absent from final report sources, invalid manual QA counters that could hide P0 issues, empty severity issue-log entries, duplicate approval-target checks that inflate coverage, placeholder/template/mock/fixture slide ids used as regeneration or title-edit evidence, and manual QA records that skip required research, slide generation, or export approval target checks; still needs a non-developer 10-minute QA session with validator-ready persisted session evidence.                                                                                                                                                                                                                                                                                                                                                 |
| DF-247 | Blocked by upstream Live evidence   | `src/lib/live-release-gate.ts`, `src/lib/live-release-lineage-gate.ts`, `src/lib/live-release-final-export-gate.ts`, `src/lib/live-release-p0-gate.ts`, `src/lib/live-release-benchmark-gate.ts`, `src/lib/live-release-decision-gate.ts`, `src/lib/live-release-gate.test.ts`, `src/lib/live-release-gate-final-export.test.ts`, `docs/live-release-decision.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | All prerequisite P0 tickets must be `Verified - Live`; contradictory duplicate P0 ticket status evidence now blocks with `p0_ticket_status_conflict`; contradictory duplicate benchmark scenario outcomes now block with `live_benchmark_status_conflict`; the release decision must explicitly move from `Blocked` to `approved` in canonical `docs/live-release-decision.md`; benchmark pass count now requires the five named DF-242 benchmark scenarios and at least four named passes with `failureDomain: "none"`, rather than any five ad-hoc benchmark ids; the gate now rejects missing Golden Path lineage before checking for mock/fixture contamination, rejects lineage that does not include a non-synthetic final export artifact with `golden_path_export_missing`, rejects final export lineage that is not from a production Codex session with `golden_path_export_not_live`, rejects invalid negative or fractional critical defect counters, and rejects unresolved P1 summaries that name data loss, security, billing, payment, source, or citation risks before release readiness can pass.                                                                                                         |

DF-234 local update: `src/components/deck/review-gallery-preview-validation.ts` now rejects distinct review items that reuse one compositor preview PNG with `duplicate_compositor_preview`. This prevents a five-slide review gallery from satisfying local Live readiness with repeated placeholder thumbnails while the stored background artifact refs differ. `src/components/deck/review-gallery-preview-validation.test.ts` covers the previous false-ready case. The issue remains open until packaged-app live compositor screenshots from five real image artifacts and title edit/re-export QA are captured.

DF-234 local update: `src/components/deck/review-gallery-title-edit-export-validation.ts` now blocks otherwise valid Live review gallery evidence unless title edit re-export evidence is present for the reviewed slide and the exported SVG contains the edited title. Missing title edit export evidence blocks with `missing_title_edit_reexport_evidence`; mismatched/stale exported title evidence blocks with `title_edit_reexport_mismatch`. `src/components/deck/review-gallery-title-edit-export.test.ts` covers missing, mismatched, and valid title edit re-export evidence. The issue remains open until packaged-app live compositor screenshots from five real image artifacts and title edit/re-export QA are captured.

DF-234 local update: `src/components/deck/review-gallery-title-edit-export-validation.ts` now also rejects title edit re-export evidence whose exported SVG path is synthetic, non-project-scoped, or marked as template/sample/example/placeholder evidence, even when the SVG content contains the edited title. `src/components/deck/review-gallery-title-edit-export.test.ts` covers the false-ready template export path. The issue remains open until packaged-app live compositor screenshots from five real image artifacts and title edit/re-export QA are captured.

DF-234 local update: title edit re-export evidence now rejects exported SVG
paths that only become valid after trimming boundary whitespace. A padded
`projects/.../exports/svg/slide_01.svg` value now blocks with
`title_edit_reexport_mismatch`, so packaged review or manual-QA evidence cannot
turn a non-canonical export artifact path into a ready title-edit proof. The
issue remains open until packaged-app live compositor screenshots from five real
image artifacts and title edit/re-export QA are captured.

DF-234 local update: title edit re-export evidence now also has to carry the reviewed compositor export basis and stored background artifact id/path/hash. This prevents a project-scoped SVG that contains the edited title, but was detached from the real reviewed background artifact, from satisfying the packaged title edit QA requirement. `src/components/deck/review-gallery-title-edit-export.test.ts` covers the detached-compositor false-ready case. The issue remains open until packaged-app live compositor screenshots from five real image artifacts and title edit/re-export QA are captured.

DF-235 local update: `src/lib/live-slide-regeneration-candidate.ts` now treats the regenerated background provenance sidecar as part of the versioned storage identity. A candidate whose binary and metadata paths look correct but whose provenance sidecar points at another artifact or slide is rejected with `background_artifact_storage_path_mismatch`; `src/lib/live-slide-regeneration-provenance.test.ts` covers the false-ready case. The issue remains open until packaged-app live full-slide regeneration before/after approval QA, a real provider regenerated background artifact version, and failed-regeneration original-preservation evidence are captured.

DF-235 local update: `src/lib/live-slide-regeneration-approval.ts` now requires matching before/after comparison evidence before `approveLiveSlideRegenerationCandidate` can replace the approved original with a regenerated candidate. Missing comparison evidence blocks with `missing_regeneration_comparison`, non-ready candidates block with `candidate_not_ready_for_approval`, descriptor/version/artifact drift blocks with `regeneration_comparison_mismatch`, and failed preserved-target comparison checks block with `regeneration_preservation_check_failed`; `src/lib/live-slide-regeneration-approval.test.ts` covers missing and mismatched comparison false-ready cases. The issue remains open until packaged-app live full-slide regeneration before/after approval QA, a real provider regenerated background artifact version, and failed-regeneration original-preservation evidence are captured.

DF-235 local update: `src/lib/live-slide-regeneration-approval.ts` now also requires comparison `requestedChanges` and `preservedTargets` to match the regenerated candidate's `mustChange` and `mustKeep` request provenance before approval can replace the original. `src/lib/live-slide-regeneration-approval.test.ts` covers the false-ready case where descriptor evidence matched but the comparison target list drifted. The issue remains open until packaged-app live full-slide regeneration before/after approval QA, a real provider regenerated background artifact version, and failed-regeneration original-preservation evidence are captured.

DF-235 local update: live regeneration request validation now rejects padded original background artifact or provider request evidence with `original_background_evidence_not_canonical` before provider submission. This prevents a whitespace-padded approved original artifact id from being stored in the request and later making the same artifact look like a new regenerated background. `src/lib/live-slide-regeneration-request-validation.test.ts` covers the previous false-ready path. The issue remains open until packaged-app live full-slide regeneration before/after approval QA, a real provider regenerated background artifact version, and failed-regeneration original-preservation evidence are captured.

DF-235 local update: live regeneration request validation now rejects padded `mustKeep`/`mustChange` targets with `revision_target_not_canonical` before provider submission. This prevents a request target such as ` title text ` from later satisfying before/after comparison evidence only because both sides are trimmed during target matching. `src/lib/live-slide-regeneration-request-validation.test.ts` covers the false-ready path. The issue remains open until packaged-app live full-slide regeneration before/after approval QA and failed-regeneration original-preservation evidence are captured.

DF-210 live update: a direct stdio App Server cleanup probe on 2026-06-19 KST started `codex app-server --stdio` with standalone `codex-cli 0.141.0`, sent `initialize` and `account/read`, observed authenticated ChatGPT account state with 3 parseable stdout protocol JSON lines, 0 stderr lines, and 0 parse errors, then closed stdin. The child exited with code `0`, signal `null`, total duration 69 ms, and shutdown after stdin close in 4 ms. Evidence digest: `f35e49556578ced8eedb4f6fbe5dcdf8ee742863037c7787166cd1d4232eb1cd`. The desktop smoke and structured-turn bridge evidence now also preserves `protocolLineCount` and `stderrLogLineCount`, so app-produced App Server evidence cannot silently discard the stderr log channel while treating stdout protocol frames as the only stream. Desktop smoke evidence now also blocks as `invalid_smoke_evidence` unless initialize succeeds, an authenticated account is present, nonblank thread/turn ids are present, stdout protocol frames are captured, and a completed protocol health turn with `turn/completed` is observed. Desktop structured-turn evidence now blocks as `invalid_structured_turn_evidence` unless runtime, nonblank thread/turn ids, `turnCompleted`, stdout protocol frames, `eventMethods`, and preserved notifications prove a completed `turn/completed` protocol turn. The issue remains open because the required clean macOS account reproduction of bootstrap, health, restart, and desktop command invocation has not run.

DF-210 local contract update: `evaluateCodexAppServerInitializeSmoke` now rejects initialized evidence with missing protocol identity fields before stdio initialize can count. `evaluateCodexAppServerHealthTurn` rejects blank or non-canonical completed health turns before they can count as authenticated App Server evidence, and `evaluateCodexAppServerRestartSmoke` rejects same-pid restart evidence, blank crash-probe output, blank or non-canonical post-restart thread/turn ids, post-restart health turns captured with a different CLI version, blank or CLI-mismatched `appServerVersion`, and restart claims that reuse the same pre-restart health thread and turn even when the reused ids are whitespace-padded. The issue remains open because this only prevents false bootstrap/restart readiness; it is not clean macOS account reproduction.

DF-210 local contract update: initialize smoke evidence now rejects stderr JSON-RPC protocol frames before the stdout/stderr channel-separation claim can count as ready. This prevents an initialized App Server run from satisfying the protocol/log channel split if protocol JSON was emitted on stderr. The issue remains open because clean macOS account bootstrap, health, restart, and packaged desktop command invocation evidence is still required.

DF-210 local contract update: completed health turns now require ChatGPT account mode evidence in addition to durable nonblank thread and turn ids. This prevents non-ChatGPT account modes, including API-key or Bedrock account-mode turns, from satisfying the authenticated App Server health-turn gate. The issue remains open because clean macOS account bootstrap, health, restart, and packaged desktop command invocation evidence is still required.

DF-246 local update: `sessionEvidenceIssues` now rejects manual QA session paths marked as template, sample, example, or placeholder bundles, even when the path is otherwise a non-synthetic JSON file under `manual-qa` and contains `session`. This prevents an observer template such as `manual-qa/session-template-20260619.json` from satisfying the persisted observed-session evidence requirement. The issue remains open because a real non-developer 10-minute packaged-app manual QA run and validator-ready evidence bundle are still missing.

DF-246 local update: manual QA session evidence now also rejects generic notes bundles whose path still contains `session`, such as `manual-qa/session-notes-20260619.json`. This closes a false-ready path where observer notes could satisfy `sessionEvidencePath` without being the persisted observed-session evidence bundle. The issue remains open because a real non-developer 10-minute packaged-app manual QA run and validator-ready evidence bundle are still missing.

DF-246 local update: manual QA session evidence now also rejects generic session bundle names such as `manual-qa/session-generic-20260619.json`. This closes a false-ready path where a broad session label could satisfy `sessionEvidencePath` without proving a persisted observed non-developer QA session artifact. The issue remains open because a real non-developer 10-minute packaged-app manual QA run and validator-ready evidence bundle are still missing.

DF-246 local update: manual QA regeneration/title-edit evidence now filters out placeholder, template, sample, example, mock, fixture, test, or fake slide ids before deciding whether a slide was regenerated or a title was edited. A record with only `placeholder-slide` and `template-title-slide` now blocks with `missing_slide_regeneration` and `missing_title_edit`, so placeholder ids cannot satisfy the user manual QA action requirements. The issue remains open because a real non-developer 10-minute packaged-app manual QA run and validator-ready evidence bundle are still missing.

DF-247 local update: `evaluateLiveInitialReleaseGate` now blocks unresolved P1 risks whose summary text contradicts a non-blocking `other` category by naming security, data-loss, billing/payment, source, or citation risks. This prevents a release-ready result when the structured category is too weak but the persisted P1 summary still describes a blocking release concern. The issue remains open because all prerequisite P0 tickets, real benchmark/Golden Path/manual QA/package evidence, and the final approved release decision are still missing.

DF-247 local update: `evaluateLiveInitialReleaseGate` now requires Golden Path lineage to include the exact final export artifact id before release can be ready. This prevents an arbitrary production Codex artifact, such as interview questions, from satisfying the Golden Path lineage requirement while the final export artifact is absent. The issue remains open because all prerequisite P0 tickets, real benchmark/Golden Path/manual QA/package evidence, and the final approved release decision are still missing.

DF-247 local update: `evaluateLiveInitialReleaseGate` now refuses synthetic final export artifact ids marked as mock, fixture, test, fake, template, sample, example, or placeholder before counting Golden Path final-export coverage. This prevents a lineage row such as `placeholder_export_artifact` from satisfying the release gate just because the same id appears in production-looking provenance. The issue remains open because all prerequisite P0 tickets, real benchmark/Golden Path/manual QA/package evidence, and the final approved release decision are still missing.

DF-247 local update: final export lineage now must identify a production Codex session artifact with authenticated Codex session mode and nonblank thread/turn ids. A local or development final export row such as `live_export_001:development/local/local` now blocks with `golden_path_export_not_live`, so matching the final export artifact id alone cannot satisfy final release readiness. The issue remains open because all prerequisite P0 tickets, real benchmark/Golden Path/manual QA/package evidence, and the final approved release decision are still missing.

DF-233 live update: `src/lib/live-image-queue-evidence.ts`, `src/lib/live-image-queue-cancellation.ts`, `src/lib/live-image-queue-retry-slide.ts`, `src/lib/live-image-queue-evidence.test.ts`, `src/lib/live-image-queue-cancel-attempt.test.ts`, `src/lib/live-image-queue-cancelled-job.test.ts`, and `src/lib/live-image-queue-retry-slide.test.ts` now gate queue evidence before it can count toward Live release or QA. The validator rejects retry events without a recorded provider job, retry events without slide-generation prompt usage, retry counts or attempt sequences that do not match the provider job's final attempt, retry bundle ids that diverge from prompt usage bundle ids, retry slide numbers that differ from the retried job output/failure, non-transient retry failure kinds, cancellation failures without a cancelled provider job, cancelled provider jobs without matching slide failure evidence, cancelled jobs that do not preserve the user cancel signal, cancelled slide failures whose bundle id does not match the recorded prompt usage bundle for that provider job, and cancelled slide failures whose attempt count does not match the cancelled provider job. The issue remains open because live throttling, cancellation manual QA, and partial resume after app restart still need real provider artifacts.

DF-233 local update: live image queue evidence now rejects cancelled provider jobs that are missing matching cancelled slide failure evidence with `cancelled_job_missing_failure`. This prevents a queue result from hiding a cancelled image job while reporting success or omitting the cancelled slide from the failure list. The issue remains open because live provider throttling, manual cancellation QA, and restart partial-resume still need real stored image artifacts.

DF-233 local update: `src/lib/live-image-queue-retry-delay.ts` now rejects retry provenance whose delay sequence differs from the failed slide `retryDelaysMs` with `retry_delay_history_mismatch`; `src/lib/live-image-queue-retry-delay.test.ts` covers the false-ready case. The issue remains open because live provider throttling, manual cancellation QA, and restart partial-resume still need real provider artifacts.

DF-233 local update: `src/lib/live-image-queue-retry-delay.ts` now also rejects negative, fractional, or non-finite retry delays with `retry_delay_invalid`; `src/lib/live-image-queue-retry-delay-invalid.test.ts` covers a retry provenance event with `delayMs: -1` that otherwise matches the job, prompt bundle, slide, and attempt metadata. The issue remains open because real provider 429/5xx retry, in-flight cancellation, and packaged restart-resume evidence still need real Codex OAuth image artifacts.

DF-233 local update: `src/lib/slide-generation-queue.ts` now records requested, effective, and observed concurrency evidence for each ready queue result. `src/lib/live-image-queue-concurrency.ts` rejects missing queue throttle proof with `missing_concurrency_evidence` and observed concurrency above the effective limit with `concurrency_limit_exceeded`; `src/lib/live-image-queue-concurrency.test.ts` covers the false-ready missing-evidence case, the over-limit evidence case, and queue execution evidence from `maxParallel`. The issue remains open because real provider throttling, manual cancellation QA, and restart partial-resume still need stored live image artifacts.

DF-233 local update: `src/lib/live-image-queue-concurrency.ts` now also rejects queue evidence whose requested or effective concurrency limit is zero with `invalid_concurrency_evidence`. `src/lib/live-image-queue-concurrency.test.ts` covers the false-ready zero-limit case while still allowing `observedMaxRunning: 0` for legitimate no-new-work resume evidence. The issue remains open because live provider throttling, manual cancellation QA, and restart partial-resume still need real stored image artifacts.

DF-233 local update: `src/lib/live-image-queue-progress.ts` now rejects queue evidence whose reported progress or status contradicts the recorded slide/failure outputs. Inflated progress blocks as `queue_progress_count_mismatch`, and success/failure status drift blocks as `queue_status_count_mismatch`; `src/lib/live-image-queue-progress.test.ts` covers both false-ready shapes. The issue remains open because real provider 429/5xx retry, in-flight cancellation, and packaged restart-resume evidence still need real Codex OAuth image artifacts.

DF-233 local update: `src/lib/live-image-queue-evidence.ts` now rejects non-cancelled provider failure rows that are not tied to a recorded failed provider job and matching slide-generation prompt usage. Missing job evidence blocks as `failure_job_not_found`, missing prompt usage linkage blocks as `failure_prompt_usage_missing`, and `src/lib/live-image-queue-evidence.test.ts` covers the false-ready case. The issue remains open because real provider 429/5xx retry, in-flight cancellation, and packaged restart-resume evidence still need real Codex OAuth image artifacts.

DF-244 live update: `ProviderJobProgressPanel` now renders app-surface provider id, measured execution duration, retry count, token/image usage items, `estimatedCostUsd` only as `cost estimate`, confirmed Codex image usage disclosure labels only when `apiKeyRequired: false`, persisted non-synthetic, non-local `confirmationEvidencePath` JSON evidence, and user confirmation exist, and unconfirmed Codex image usage status when the job usage summary carries no such evidence, `apiKeyRequired: true`, or `userConfirmed: false`, including confirmed-looking payloads that set `apiKeyRequired: false` without evidence. The summary, progress view, and audit report now redact secret-like text inside image usage disclosure labels before display. The panel integration test covers the live Codex usage-probe shape with provider `codex`, duration `7158ms`, `retries 1`, `input 25006`, `output 141`, and `cost estimate $0.0400`; it also covers the image usage shape with `images 5`, `cost estimate $0.1800`, `Codex image usage confirmed`, and `Codex image usage not confirmed` for an unconfirmed, API-key-required, evidence-less, or developer-local confirmed-looking Codex usage payload. `evaluateLiveUsageSummary` rejects blank, padded, or duplicated stage ids, runtime provider kinds outside the DeckForge taxonomy, empty provider-supplied usage objects, incomplete Codex input/output token pairs, image usage evidence without image counts, Codex image usage confirmation without persisted non-local evidence, API-key-required image disclosure, negative/fractional token or image counts, negative/non-finite cost amounts, and unsupported runtime cost labels before summary approval, and the app progress view omits invalid provider payload values such as negative tokens, fractional token counts, or `NaN` cost from visible usage rows. The issue remains open because packaged app manual QA with real provider image Codex usage disclosure payloads has not run.

DF-244 local update: usage summary stage ids now reject boundary-whitespace-padded values with `noncanonical_usage_stage_identity`. This prevents a row such as `stageId: " generate "` from avoiding exact generate-stage image confirmation checks while still looking displayable after trimming. `src/lib/live-usage-summary-stage-identity.test.ts` covers the false-ready path. The issue remains open because packaged app manual QA with real provider image Codex usage disclosure payloads has not run.

DF-244 local update: `src/lib/live-usage-billing-evidence.ts` now rejects template, sample, example, or placeholder `confirmationEvidencePath` JSON bundles before image usage confirmation can count. `evaluateLiveUsageSummary` stays blocked and `ProviderJobProgressPanel` renders `Codex image usage not confirmed` when a confirmed-looking image usage payload points at `usage/image-billing-template.json`. The issue remains open because packaged app manual QA with real provider usage/cost payloads and real image Codex usage disclosure evidence has not run.

DF-244 local update: `src/lib/live-usage-billing-evidence.ts` now also rejects generic confirmation JSON filenames that do not end in `image-billing-confirmation.json`. A confirmed-looking payload with `confirmationEvidencePath: "usage/generic-confirmation.json"` stays blocked as `missing_image_billing_confirmation`, preventing broad observer confirmation files from satisfying the product-generated Codex OAuth image usage confirmation contract. The issue remains open because packaged app manual QA with real provider usage/cost payloads and real image Codex usage disclosure evidence has not run.

DF-244 local update: `src/lib/audit-log.ts` now uses the same persisted image usage evidence rule as the summary and progress surfaces before report usage lines can display `Codex image usage confirmed`. A confirmed-looking audit payload without valid `confirmationEvidencePath` now renders `Codex image usage not confirmed`, so exported reports cannot imply user-confirmed Codex image usage from label text alone. The issue remains open because packaged app manual QA with real provider image Codex usage disclosure payloads has not run.

DF-244 local update: `formatLiveUsageSummary` now uses the same persisted image usage evidence rule as summary approval, progress, and audit surfaces before formatted usage summaries can display `Codex image usage confirmed`. Confirmed-looking image usage labels without a valid `confirmationEvidencePath` render as `Codex image usage not confirmed`, so plain usage-summary output cannot imply user-confirmed Codex image usage from label text alone. The issue remains open because packaged app manual QA with real provider usage/cost payloads and real image Codex usage disclosure evidence has not run.

DF-244 product update: `src/lib/live-image-billing-confirmation.ts` now creates and persists the pre-generation Codex OAuth image usage confirmation record as `usage/<project>/<job>/image-billing-confirmation.json`, returns a matching `ProviderImageBillingDisclosure`, and leaves declined or unpersisted confirmations unusable as evidence. `src/components/deck/GenerateStage.tsx` records that disclosure on production `codex` image jobs before generation starts and cancels the queued job if the confirmation is declined or cannot be persisted. `src/lib/generate-stage-recovery.ts` owns the Generate-stage job recovery storage split so the screen stays under the 250 pure-LOC ceiling. The issue remains open until a packaged-app Codex image run captures the actual persisted confirmation JSON and the DF-244 usage bundle is regenerated from that run.

DF-244 App Server rich usage update: `src/lib/live-app-server-usage-summary.ts` now preserves valid richer `usageSummary` or `usage` payload fields from `thread/tokenUsage/updated`, including `imageCount`, `estimatedCostUsd`, and `imageBillingDisclosure.confirmationEvidencePath`, while still carrying the App Server token totals. Preserved `estimatedCostUsd` values set the stage `costLabel` to `estimate`, so app, summary, and audit display surfaces continue to render `cost estimate` rather than exact charges. Empty or malformed provider usage payloads still block as `missing_provider_usage_summary`. The issue remains open because packaged-app manual QA still needs real image usage payloads and persisted confirmation JSON from the same Codex OAuth image run.

DF-244 evidence generator update: `scripts/lane-d-live-usage-confirmation.mjs` now resolves the Lane D usage summary from an actual persisted Codex OAuth image confirmation record under `usage/<project>/<job>/image-billing-confirmation.json`. The generator only emits `confirmed_app_surface_pre_generation_codex_oauth` when the JSON record is canonical and its internal `evidencePath` matches its product storage location; otherwise the generated `df244-usage-summary.json` remains blocked as `missing_app_surface_pre_generation_confirmation`. `scripts/lane-d-live-usage-confirmation.test.mjs` covers the ready and path-drift false-ready cases. The issue remains open because the current committed Lane D bundle still has no packaged-app confirmation record to consume.

DF-205 local update: `classifyLiveAuthFailure` now normalizes provider reason/message evidence before deciding whether a failure is expired login, unauthorized, insufficient permission, or organization verification required. A 401 with `login_expired` reason text or `Session expired` provider message now remains `login_expired` instead of falling through to generic unauthorized, and a 403 `verify your organization` provider message now remains `organization_verification_required` instead of falling through to generic insufficient permission. `redactSensitiveText` and `serializeProjectList` now also redact quoted `CODEX_SESSION="..."` values, serialized secret fields such as `"token":"..."`, access/refresh/auth token field variants such as `"access_token":"..."` and `"refreshToken":"..."`, and OAuth identity/session/client secret variants such as `"id_token":"..."`, `"sessionToken":"..."`, and `"clientSecret":"..."` after JSON escaping, so project DB persistence cannot preserve quoted Codex session material or OAuth-style token fields that the previous bare-assignment guard missed. `connectImageApiKeySecret` now also rejects secret references that hide the image API key as reversible base64, base64url, or hex material before the reference can be treated as safe. The issue remains open because fresh login manual QA, logout/relogin QA, and packaged OS keychain bridge QA are still external Live evidence requirements.

DF-205 local update: `connectImageApiKeySecret` now rejects `LiveSecretReference` values whose `service` or `account` drifts from the DeckForge image-key save request with `LiveSecretReferenceScopeError`. This prevents a secret store from returning a production-looking keychain reference for another service or workspace account while the UI treats it as the active image credential. The issue remains open because fresh login manual QA, logout/relogin QA, and packaged OS keychain bridge QA are still external Live evidence requirements.

DF-205 local update: `connectImageApiKeySecret` now rejects `LiveSecretReference.createdAt` values that drift from the save request timestamp with `LiveSecretReferenceTimestampError`. This prevents a stale or future-dated keychain reference from being treated as the current image credential after the secret store write. The issue remains open because fresh login manual QA, logout/relogin QA, and packaged OS keychain bridge QA are still external Live evidence requirements.

DF-205 local update: `connectImageApiKeySecret` and `disconnectImageApiKeySecret`
now reject blank or boundary-whitespace-padded `LiveSecretReference` identity
fields with `LiveSecretReferenceIdentityError`. This prevents an empty
`secretId` from being treated as stored credential evidence and prevents a
trim-only delete target from reaching the keychain delete call. The issue
remains open because fresh login manual QA, logout/relogin QA, and packaged OS
keychain bridge QA are still external Live evidence requirements.

DF-205 local update: `disconnectImageApiKeySecret` now also rejects wrong-service
secret references with `LiveSecretReferenceScopeError` before calling the
keychain delete function. A `deckforge.other.secret` reference can no longer
make logout or cleanup evidence look like the DeckForge image credential
lifecycle was deleted. Regression coverage lives in
`src/lib/live-auth-lifecycle-disconnect-scope.test.ts`. The issue remains open
because fresh login manual QA, logout/relogin QA, and packaged OS keychain
bridge QA are still external Live evidence requirements.

DF-223 local update: `validateLiveResearchEvidence` now rejects persisted evidence refs when the linked Research source lacks persisted `capture.rawArchivePath`, even if the evidence ref itself names a plausible artifact path. The source artifact validator was split into `src/lib/live-research-source-artifact-evidence.ts`, with regression coverage in `src/lib/live-research-source-artifact-evidence.test.ts`; `missing_source_artifact` now covers both blank evidence artifact paths and invented paths for sources without capture metadata. Evidence ref datasets must also belong to the claim's `datasetIds`, and unlinked evidence-ref datasets no longer satisfy the major-number dataset requirement. The issue remains open because an authenticated packaged-app live Research Pack review with app-produced evidence references is still required.

DF-223 local update: dataset-backed major-number claims now require the referenced dataset to be sourced by at least one of the claim's source artifact ids. A dataset whose `sourceIds` point only at an unrelated source fails with `unknown_reference` and no longer satisfies `missing_number_dataset`, with coverage in `src/lib/live-research-number-evidence.test.ts`. The issue remains open because an authenticated packaged-app live Research Pack review with app-produced evidence references is still required.

DF-223 local update: persisted evidence refs now require canonical captured source artifact paths. When `LiveResearchEvidenceReference.sourceArtifactPath` and `ResearchPack.sources[].capture.rawArchivePath` only match after trimming whitespace, validation fails with `source_artifact_mismatch`, so a roundtrip cannot rely on padded artifact paths as live evidence. The issue remains open because an authenticated packaged-app live Research Pack review with app-produced evidence references is still required.

DF-223 local update: persisted evidence refs now require unique ids across the Research Pack. Duplicate `LiveResearchEvidenceReference.id` values fail with `duplicate_evidence_reference`, so a claim-to-source roundtrip cannot reuse one evidence identity for multiple saved quote/table references. The issue remains open because an authenticated packaged-app live Research Pack review with app-produced evidence references is still required.

DF-223 local update: persisted evidence refs now require canonical ids across `id`, `claimId`, `sourceId`, and optional `datasetId`. A `LiveResearchEvidenceReference` whose durable identity only becomes usable after trimming whitespace fails with `noncanonical_evidence_reference`, so a claim-to-source roundtrip cannot rely on padded evidence identities before approval or Deck Plan handoff. The issue remains open because an authenticated packaged-app live Research Pack review with app-produced evidence references is still required.

DF-224 local update: source exclusion now removes numeric evidence whose dataset was removed by the source decision even when the numeric evidence still names a retained source. This prevents a deleted dataset from leaving a stale major-number evidence item in the review state after source exclusion. The issue remains open because a non-simulated packaged-app live research approval manual QA run with app-produced live sources, evidence refs, and provider provenance is still required.

DF-224 local update: live research approval now requires provider provenance for the current Research Pack artifact id. Complete Codex provenance for another artifact blocks approval with `research_pack_provenance_mismatch`, so a stale or unrelated research artifact cannot unlock the DF-214 `approvedResearchPackHash` handoff. The issue remains open because a non-simulated packaged-app live research approval manual QA run with app-produced live sources, evidence refs, and provider provenance is still required.

DF-224 local update: live research approval now requires provider provenance for the exact canonical current Research Pack artifact id. Whitespace-padded artifact ids no longer match after trimming and block with `research_pack_provenance_mismatch`, so a provider sidecar must preserve the same artifact identity that DF-214 will receive in the approved Research Pack handoff. The issue remains open because a non-simulated packaged-app live research approval manual QA run with app-produced live sources, evidence refs, and provider provenance is still required.

DF-224 local update: source exclusion plus reinforcement request/resolution review mutations now clear stale `ResearchPack.provenanceLineage` along with stale approval hashes. This prevents old provider provenance for the pre-review Research Pack from unlocking a later DF-214 `approvedResearchPackHash` handoff after the user changes review state. The issue remains open because a non-simulated packaged-app live research approval manual QA run with app-produced live sources, evidence refs, and provider provenance is still required.

DF-224 local update: live research approval now requires current Research Pack provider provenance to carry a `live_research_pack@...` prompt version in addition to the exact canonical artifact id. Stage-wrong Codex provenance such as a Deck Plan prompt can no longer unlock `approvedResearchPackHash` handoff even if it reuses the Research Pack artifact id. The issue remains open because a non-simulated packaged-app live research approval manual QA run with app-produced live sources, evidence refs, and provider provenance is still required.

DF-224 local update: live research approval now rejects source capture metadata that only becomes valid after trimming whitespace. Padded `finalUrl`, MIME values, archive paths, or hash labels fail with `source_capture_incomplete`, so a reviewer cannot approve a Research Pack whose displayed source metadata differs from the durable captured artifact fields. The issue remains open because a non-simulated packaged-app live research approval manual QA run with app-produced live sources, evidence refs, and provider provenance is still required.

DF-230 local update: `createImagePathDecisionRecord` now treats placeholder image-route decision metadata such as `unknown`, `TBD`, `not set`, `none`, or `n/a` as missing billing owner or missing required provider permissions. This prevents a route from locking just because the billing/permission fields are non-empty placeholders. The issue remains open because one successful real Codex image turn plus stored binary and provenance sidecar artifacts from the selected route are still required.

DF-230 local update: image path locking now requires provider provenance `promptVersion` to match the successful image artifact prompt lineage, blocking unrelated prompt sidecars with `provenance_prompt_version_mismatch`. This prevents a real-looking binary/provenance pair from locking production generation when the sidecar belongs to a different prompt contract. The issue remains open because one successful real Codex image turn plus stored binary and provenance sidecar artifacts from the selected route are still required.

DF-230 local update: image path locking now rejects padded OpenAI image turn ids as `provenance_request_id_mismatch` instead of comparing trimmed artifact ids to provider provenance. This prevents a production route from locking when artifact request identity only becomes valid after trimming. The issue remains open because one successful real Codex image turn plus stored binary and provenance sidecar artifacts from the selected route are still required.

DF-230 local update: the production image generation gate now revalidates persisted locked decisions for canonical OpenAI request ids instead of trimming padded stored ids into readiness. Persisted request ids such as `` ` img_req_001 ` `` now block with `provenance_request_id_mismatch`, so a project reload cannot turn trim-only request identity into a production-ready route. The issue remains open because one successful real Codex image turn plus stored binary and provenance sidecar artifacts from the selected route are still required.

DF-230 local update: image path decision metadata now requires every required permission entry to be meaningful non-placeholder text. A mixed permission list such as `images.generate` plus `TBD` now blocks with `missing_required_permissions`, so a route cannot lock with one real-looking permission hiding unresolved billing or model entitlement evidence. The metadata checks were split into `src/lib/image-path-decision-metadata.ts` to keep `image-path-decision.ts` below the 250 pure-LOC ceiling. The issue remains open because one successful real Codex image turn plus stored binary and provenance sidecar artifacts from the selected route are still required.

DF-230 local update: the production image generation gate now revalidates persisted binary/provenance artifact paths without trimming them into readiness. Padded paths such as `` ` projects/project_001/slides/images/slide_001.v1.png ` `` now block with `invalid_binary_artifact_path` / `invalid_provenance_artifact_path`, so a project reload cannot turn trim-only artifact storage identity into a production-ready image route. The issue remains open because one successful real Codex image turn plus stored binary and provenance sidecar artifacts from the selected route are still required.

DF-231 local update: `generateAndStoreSlideImageArtifact` now catches `ImageArtifactStoreError` validation failures from storage and returns a non-retryable `provider_contract` failure without artifact writes. Provider output that passes the initial artifact shape contract but fails PNG/request metadata storage validation can no longer escape as an exception from the live adapter. The issue remains open because real provider bytes and Codex turn metadata from a live selected route still need to be persisted.

DF-231 local update: image artifact storage now rejects blank prompt hash/version or blank layout screenshot references before writing binary, metadata, or provenance sidecars. This prevents stored provider provenance from inventing `inputArtifactIds` without real prompt/layout lineage. The issue remains open because real provider bytes and Codex turn metadata from a live selected route still need to be persisted.

DF-231 local update: image artifact storage now rejects whitespace-padded original provider turn ids or models before writing binary, metadata, or provenance sidecars. This prevents stored request metadata and provider provenance from preserving trim-only strings as canonical provider identity evidence. The issue remains open because real provider bytes and Codex turn metadata from a live selected route still need to be persisted.

DF-231 local update: image artifact storage now also rejects whitespace-padded or blank optional provider response metadata such as `size` and `quality` before writing binary, metadata, or provenance sidecars. This prevents a stored live artifact from preserving trim-only response metadata while otherwise carrying valid turn/model evidence. The issue remains open because real provider bytes and Codex turn metadata from a live selected route still need to be persisted.

DF-231 local update: image artifact storage now rejects empty provider `usage` objects before writing binary, metadata, or provenance sidecars. If the provider supplies usage metadata, at least one usage or cost field must be present, so `{ usage: {} }` can no longer inflate request metadata completeness without evidence. The request metadata checks were split into `src/lib/image-artifact-store-request-metadata.ts` and the shared store error moved to `src/lib/image-artifact-store-error.ts` so `image-artifact-store.ts` stays below the 250 pure-LOC ceiling. The issue remains open because real provider bytes and Codex turn metadata from a live selected route still need to be persisted.

DF-231 local update: image artifact storage now rejects prompt/layout lineage that only becomes canonical after trimming whitespace before writing binary, metadata, or provenance sidecars. `prompt.id`, `prompt.version`, `prompt.hash`, and `layoutReference.screenshot` must be canonical nonblank values, so stored provenance `promptVersion` and `inputArtifactIds` cannot preserve trim-only lineage as live provider evidence. The issue remains open because real provider bytes and Codex turn metadata from a live selected route still need to be persisted.

DF-232 local update: five-background batch validation now rejects blank live artifact request models before accepting matching stored metadata/provenance sidecars. This prevents a batch from counting as five real provider outputs when provider turn ids exist but the provider model/runtime evidence is blank. The issue remains open because a packaged production provider run still needs to store five real background artifacts.

DF-232 local update: five-background batch validation now treats whitespace-padded original provider turn ids or request models as `missing_provider_request_metadata`, even when stored metadata/provenance sidecars repeat the same padded values. This prevents canonical provider identity evidence from being satisfied by trim-only strings. The issue remains open because a packaged production provider run still needs to store five real background artifacts.

DF-232 local update: stored five-background evidence now requires the binary artifact path to point at the same slide number as the live artifact and requires metadata/provenance sidecar paths to match that same versioned binary path. This prevents a batch from passing with a valid-looking PNG path but fixture/local sidecar paths or a sidecar/binary path for another slide. The issue remains open because a packaged production provider run still needs to store five real background artifacts.

DF-232 local update: stored five-background evidence now rejects empty provider `usage` objects in live artifact or stored metadata request sidecars. If usage metadata is supplied for a background artifact, it must contain at least one usage or cost field, so `{ usage: {} }` can no longer count as complete stored request metadata for the five-background batch. The issue remains open because a packaged production provider run still needs to store five real background artifacts.

DF-232 local update: stored five-background evidence now requires the provider provenance sidecar content to match the stored binary and live artifact. A sidecar whose `artifactId`, `executionMode`, `providerKind`, `authMode`, `promptVersion`, `inputArtifactIds`, or duration points at another artifact, prompt, layout, provider, auth mode, or runtime is rejected with `stored_background_artifact_mismatch`. The issue remains open because a packaged production provider run still needs to store five real background artifacts.

DF-240 local update: `validateLiveGenerationReportLineage` now rejects reused text artifact ids and reused image artifact ids across slide lineage rows before report/export provenance can count. The contamination checks were split into `src/lib/live-generation-report-contamination.ts`, and `src/lib/live-generation-report-artifact-identity.test.ts` covers the false-positive case where two slides shared the same text/image artifact evidence while using distinct image turn ids. The issue remains open because a packaged production run still needs to produce a zero-contamination generation report/export bundle from real text turns, image turns, compositor output, and final exports.

DF-240 local update: `evaluateFinalExportGate` now rejects production export summaries whose `artifactHash` is not a full SHA-256 digest. `src/lib/final-export-gate-live-lineage.test.ts` covers the false-positive case where complete sidecar/provider lineage previously passed with placeholder export artifact hash `sha256:export`. The issue remains open because a packaged production run still needs to produce the real export artifact digest from compositor-matched outputs.

DF-240 local update: `evaluateFinalExportGate` now rejects production export summaries whose export package path or project file path is synthetic, developer-local, or marked as `template`, `sample`, `example`, or `placeholder` evidence. `src/lib/final-export-gate-export-path.test.ts` covers the false-positive case where complete sidecar/provider lineage and a full export digest previously passed while `artifactPath` and `projectFilePath` pointed at observer-template JSON paths. The issue remains open because a packaged production run still needs to produce real compositor-matched export files and project bundle paths.

DF-240 local update: `validateLiveGenerationReportLineage` now rejects reused text turn ids across distinct slide lineage rows with `duplicate_text_turn`. `src/lib/live-generation-report-artifact-identity.test.ts` covers the false-positive case where two slides carried unique text/image artifacts and image turn ids but reused the same Codex text turn as report/export evidence. The issue remains open because a packaged production run still needs to produce real per-slide text turns, image turns, compositor output, and final export files.

DF-241 local update: `liveGoldenPathIssues` now rejects Golden Path E2E bundles that list the `live_slide_regeneration` step but only provide the five initial live image artifacts. `src/lib/live-golden-path-image-evidence.ts` now separates the five initial production `codex` image artifacts from the approved full-slide regeneration artifact, requires regeneration evidence to be both regeneration-marked and input-linked to another live image artifact, rejects missing regeneration with `missing_regenerated_live_image_artifact`, and prevents a regenerated artifact from counting toward the initial five-image floor. `src/lib/live-golden-path-regeneration-image.test.ts` covers missing and marker-only false positives. The issue remains open because a signed packaged production Golden Path run with `live_e2e_report.md`, screenshots/recording, final validation bundle, restart/reopen evidence, real sources, five initial live images, and one approved regenerated live image has not been produced.

DF-241 local update: Golden Path source evidence now uses `src/lib/live-real-source-url.ts` to reject placeholder, reserved documentation, local, or private-network source URLs before the three-source and primary/official-source requirements can pass. `src/lib/live-golden-path-source-url-evidence.test.ts` captures the false-positive case where `example.*` or documentation IP URLs previously satisfied the live-source count. The issue remains open because a signed packaged production Golden Path run with real provider sources and stored validation artifacts has not been produced.

DF-241 local update: Golden Path source evidence now counts distinct sources by normalized URL, so fragment-only or trailing-slash variants of the same real source cannot inflate the three-source requirement. `src/lib/live-golden-path-source-url-evidence.test.ts` covers the false-positive case where three SEC URL variants previously returned `ready`. The issue remains open because a signed packaged production Golden Path run with genuinely distinct real sources and stored validation artifacts has not been produced.

DF-241 local update: `src/lib/live-golden-path-evidence-path.ts` now rejects `template`, `sample`, `example`, or `placeholder` Golden Path report, screenshot, recording, and final validation bundle paths before signed report, step evidence, or validation bundle checks can count. `src/lib/live-golden-path-template-evidence.test.ts` captures the false-positive case where observer-template paths such as `reports/template/live_e2e_report.md`, `screenshots/sample/login.png`, `recordings/example/live-golden-path.mp4`, and `validation/placeholder/final-validation-bundle.zip` previously satisfied the local Golden Path gate. The issue remains open because the real signed packaged production Golden Path run and stored evidence bundle still have not been produced.

DF-241 local update: Golden Path evidence now requires production Codex provider lineage for the live interview, live research, live Deck Plan, live Design System, and live Layout IR text stages. `src/lib/live-golden-path-text-lineage.test.ts` covers the false-positive case where all completed steps and image evidence were present but `lineage` only contained image artifacts. The issue remains open because a real signed packaged production Golden Path run with stored text-stage provider artifacts has not been produced.

DF-241 local update: Golden Path text-stage lineage no longer accepts generic `plan`, `design`, or `layout` artifact/prompt labels for the Deck Plan, Design System, or Layout IR steps. Those stages must carry stage-specific `deck_plan`, `design_system`, and `layout_ir` lineage markers, so a signed bundle cannot satisfy DF-241 with ambiguous text artifacts that only look related by broad names. The issue remains open because a real signed packaged production Golden Path run with stored text-stage provider artifacts has not been produced.

DF-241 local update: shared Live evidence path validation now rejects URL-like evidence paths before Golden Path report, screenshot, recording, or final validation bundle checks can count. A bundle that points `live_e2e_report.md`, screenshots, recording, and `final-validation-bundle.zip` at `https://...` URLs now blocks with `unsigned_live_e2e_report`, `insufficient_step_evidence`, and `missing_validation_bundle` instead of looking ready from remote references alone. The issue remains open because a real signed packaged production Golden Path run with stored evidence artifacts has not been produced.

DF-245 live update: `bun run package:dry-run` regenerated the internal unsigned dry-run package on the current PR branch after the latest App Server, project-thread, interview identity, text-pipeline identity, and text-smoke resume identity evidence-gate changes. The archive `dist/deckforge-macos-dry-run.tgz` has SHA-256 `a9d25b2840b2ae41b15db3ec7dace158748a467febd1643eb46a390028c97272`, 288,674 compressed bytes, 26 archive members, and 17 extracted app files. Direct scans found 0 hits for mock provider ids, `MOCK MODE`, mock stage function names, fixture/test paths, local absolute workspace paths, `.omx`, `.playwright-mcp`, bundled `auth.json` or `.codex` payloads, long `Bearer` tokens, or secret-like `sk-*` values; `OPENAI_API_KEY` appears only in redaction guard code. `evaluateProductionPackagingEvidence` now rejects `file://`, synthetic, or developer-local package archive, native macOS bundle, persisted `releaseTrustEvidencePath` claims that do not identify a release-trust bundle, and non-canonical clean-machine runbook paths; it also rejects invalid, duplicated, or evidence-pathless clean-machine steps before they can inflate checklist coverage, reports clean-machine coverage using valid distinct checklist steps only, and rejects ad-hoc or unsigned native macOS release trust, placeholder/malformed/boundary-whitespace-padded Developer ID TeamIdentifier evidence such as `not set` or ` TEAMID1234 `, missing notarization/stapling, and Gatekeeper rejection before DF-245 evidence can become ready. The issue remains open because clean macOS account validation, Developer ID signing, notarization, stapling, Gatekeeper acceptance, and persisted release-trust assessment bundle capture have not run.

DF-245 local update: clean-machine validation now requires step-specific persisted evidence paths for every checklist item. A `codex_login` evidence path that points at another step such as `install-app.json` is rejected with `missing_clean_machine_step_evidence`, so cross-step evidence path reuse cannot inflate clean-machine coverage or hide a missing clean account action. The issue remains open because clean macOS account validation, Developer ID signing, notarization, stapling, Gatekeeper acceptance, and persisted release-trust assessment bundle capture have not run.

DF-245 local update: clean-machine validation now also rejects one shared evidence path reused for every checklist step, even when that filename contains every step marker. A multi-step path such as `install-app-codex-login-image-credentials-project-launch-live-interview.json` now blocks with `missing_clean_machine_step_evidence`, so a single observer bundle cannot impersonate five distinct clean-account actions. The issue remains open because clean macOS account validation, Developer ID signing, notarization, stapling, Gatekeeper acceptance, and persisted release-trust assessment bundle capture have not run.

DF-245 local update: `releaseTrustEvidencePath` now must identify the full release-trust assessment bundle in the path, including `codesign`, `notarytool`, `stapler`, and `spctl` markers. A generic `release-evidence/macos-release-trust.json` path now blocks with `missing_release_trust_evidence`, preventing signed/notarized/Gatekeeper-ready status from being inferred from a broad bundle label. The issue remains open because clean macOS account validation, Developer ID signing, notarization, stapling, Gatekeeper acceptance, and persisted release-trust assessment bundle capture have not run.

DF-245 local update: clean-machine validation now requires a separate persisted non-local `cleanMachineAccountEvidencePath` that identifies both `clean-machine` and `macos-account` proof. Missing, generic, or developer-local account evidence now blocks with `missing_clean_machine_account_evidence`, so step-specific checklist files alone cannot imply that the run happened from a fresh macOS account. The issue remains open because clean macOS account validation, Developer ID signing, notarization, stapling, Gatekeeper acceptance, and persisted release-trust assessment bundle capture have not run.

DF-245 local update: `releaseTrustEvidencePath` now rejects paths that only become
valid after trimming boundary whitespace. A padded path such as
` release-evidence/release-trust/codesign-notarytool-stapler-spctl.json ` now
blocks with `missing_release_trust_evidence`, so release-trust evidence cannot
pass by normalizing a non-canonical persisted path string. The issue remains
open because clean macOS account validation, Developer ID signing,
notarization, stapling, Gatekeeper acceptance, and persisted release-trust
assessment bundle capture have not run.

DF-243 local update: interruption evidence paths now reject dot-segment aliases
before recovery snapshots, cancel-signal evidence, or interrupted approval/export
gate evidence can count as canonical identities. A gate pair that stores
`docs/live-evidence/lane-h-20260621/interrupted-approval-gate.json` and
`docs/live-evidence/lane-h-20260621/../lane-h-20260621/interrupted-approval-gate.json`
now blocks with `noncanonical_interruption_evidence_identity` instead of
passing as two distinct persisted paths. The issue remains open because the
real packaged Live interruption matrix still needs live image partial-resume,
app-level persisted cancel snapshots, and interrupted approval/export scenarios.

DF-243 live update: a direct authenticated App Server probe on 2026-06-19 KST started text turn `019edc5a-0cc0-7031-915a-5fc6d65c6d86` on thread `019edc5a-0a48-7ec2-aa86-c539ed9546b1`, sent `turn/interrupt`, and confirmed `interrupted` status through `turn/completed`, `thread/read`, and `thread/turns/list` with digest `27855e9afff031bc49c87bb08bb46ea6ac9a5436e4a2eef9ecb74382e62809b6`. The live `fetchResearchSource` path also aborted HTTPS GET `fetch_shutdown_live_20260619` after 754 ms and returned retryable `failed` without persisted raw content/hash, digest `a472a031283e5a2ce537801d43a15b2d121241d823397868b81437c50e78bc3d`. A second App Server interrupt probe observed 0 late `item/completed` events for turn `019edc60-6250-7ba1-bdc4-86c28083c19d` during a 3,009 ms post-completion window, digest `f35c082c75b37ccbe7e8e5eddf1907e61e66171e13d94dd2c4df50fe3060b62f`. The local gate now rejects cancellation records that only set a boolean flag without a persisted cancel signal JSON path, interrupted approval/export checks that only set booleans without persisted gate JSON paths or reuse one path for both gates, signals targeting a different live job id, required scenarios that duplicate scenario ids or reuse one live job id or recovery snapshot path, and synthetic or developer-local matrix/evidence paths. The issue remains open because live image partial-resume, app-level persisted cancel snapshots, and interrupted approval/export scenarios have not run.

DF-243 local update: `src/lib/live-interruption-evidence-path.ts` now rejects template, sample, example, or placeholder interruption evidence JSON paths before recovery snapshots, cancel-signal evidence, or approval/export gate evidence can count. A matrix row with `recovery/text-turn-template.json` now blocks with `missing_recovery_snapshot` instead of satisfying the observed recovery snapshot requirement. `src/lib/live-interruption-matrix.ts` now also rejects matrix rows outside the five DF-243 scenario ids with `unknown_interruption_scenario`, so an extra runtime evidence row cannot hide a missing named text, fetch, image, cancellation, or approval/export interruption run. The issue remains open because the real packaged Live interruption matrix still needs live image partial-resume, app-level persisted cancel snapshots, and interrupted approval/export scenarios.

DF-243 local update: interruption evidence details now reject live job ids, recovery snapshot paths, cancel-signal ids/paths, and interrupted approval/export gate paths that only become valid after trimming boundary whitespace. Such rows block with `noncanonical_interruption_evidence_identity`, preventing padded persisted identities from satisfying the live matrix. The issue remains open because the real packaged Live interruption matrix still needs live image partial-resume, app-level persisted cancel snapshots, and interrupted approval/export scenarios.

DF-243 local update: recovery snapshot evidence paths now must identify the scenario they prove. A valid observed path such as `docs/live-evidence/lane-h-20260621/text-turn-shutdown.json` can no longer satisfy the `image_partial_resume` row; that now blocks with `interruption_evidence_path_scenario_mismatch`. The issue remains open because the real packaged Live interruption matrix still needs live image partial-resume, app-level persisted cancel snapshots, and interrupted approval/export scenarios.

DF-243 local update: `findStaleLiveContextJobs` now treats active live image/text jobs with a matching `deckContextId` but missing `deckContextHash` as stale whenever the current frozen context hash is known. This prevents interrupted or recovered provider jobs that lost their context-hash evidence from being carried forward as current-context work after upstream approval invalidation. The issue remains open because the real packaged Live interruption matrix still needs live image partial-resume, app-level persisted cancel snapshots, and interrupted approval/export scenarios.

DF-240 local update: live generation report lineage now rejects reused exported PNG hashes across distinct slide rows with `duplicate_export_hash`. A report/export bundle can no longer use one compositor-matched PNG digest to prove multiple slides while carrying otherwise unique text turns, image turns, and artifact ids. The issue remains open because a real packaged production generation report/export bundle populated from live text turns, image provider requests, compositor output, and final PNG/project exports has not run.

DF-242 local update: live benchmark screenshot evidence now rejects passed benchmark bundles whose ten screenshot paths do not name every required Golden Path step. This blocks with `output_bundle_step_screenshot_missing`, preventing anonymous captures such as `capture_1.png` through `capture_10.png` from proving a full login-to-export Golden Path inside a benchmark output bundle. The issue remains open because five real provider benchmark output bundle sets and at least four packaged Golden Path benchmark passes have not been produced.

DF-242 local update: passed benchmark bundles now reject valid scenario report, Golden Path report, or screenshot paths that borrow another DF-242 scenario id. This blocks with `output_bundle_scenario_evidence_mismatch`, preventing a `korean_business` pass from being proven by `market_research` report or screenshot evidence while keeping otherwise distinct bundle paths and artifact ids. The issue remains open because five real provider benchmark output bundle sets and at least four packaged Golden Path benchmark passes have not been produced.

## Current conclusion

The local code now rejects several classes of false Live evidence: unsafe auth/secret state after logout, unsupported image-secret store references, production mock selection, incomplete provider provenance, partial structured Codex output, unsafe interview question/Brief provenance, missing interview follow-up turns, unsafe Deck Plan/Design System/Layout IR provenance, missing approved Brief/Research handoff inputs for Deck Plan, invalid text-pipeline schema repair claims, unsafe research network methods, stale worker context, cached/mock web search candidates, pending research reinforcement requests, image provider error ambiguity, five-background batch contamination, unsafe image queue retries/resume, unsafe live interruption recovery, unlabelled usage/cost summaries, contaminated package evidence, compositor mock-background or text-collision issues, invalid full-slide regeneration candidates including reused original provider turn ids, generation report lineage gaps, incomplete Golden Path E2E bundles, unexpected Golden Path validation-bundle references, or developer-local Golden Path evidence paths, stale-package, benchmark bundles without separate regenerated image evidence, benchmark template/sample/example/placeholder evidence, cross-scenario borrowed benchmark report/Golden Path/screenshot evidence, cross-run reused benchmark Golden Path report/screenshot/source/image/request evidence, reused or synthetic final-export evidence, or mock-contaminated Live benchmark results, invalid or template manual QA evidence, missing release known-limit records, P1 summaries that contradict non-blocking release categories, and production export contamination. The current dry-run package scan also excludes mock provider, mock stage, fixture/test, secret-like, `.omx`, `.playwright-mcp`, and local absolute workspace path resources from production assets, DF-205 now has local logout cancellation plus provider UI lock state modeling, DF-203 now has restart-time Research Pack live metadata normalization, DF-210/DF-215 now have local standalone App Server daemon bootstrap plus authenticated health/resume/restart turn evidence, stdin-close shutdown/channel cleanup digest `f35e49556578ced8eedb4f6fbe5dcdf8ee742863037c7787166cd1d4232eb1cd`, current schema-constrained structured probe turn `019edb32-0a20-7812-ba4b-8603beb1b4aa`, goal-continuation schema-constrained structured probe turn `019edbdc-6472-7252-a846-334f23436989`, library-level live interview `questions`/`brief` turns `019edc17-b011-74d2-ae54-49842b7abd9d` / `019edc19-d06e-7793-9fbc-80ec053bb9fa`, library-level live Plan/Design/Layout turns `019edbf8-dce2-7a51-90ff-6fdb46137aaa`, `019edbfa-171c-7983-b2b8-33de3ead05f3`, and `019edbfb-55b5-7973-b2e2-a9825d7aa9d4`, and desktop smoke/structured-turn command coverage, DF-211 now has closed common App Server event-to-job-state mapping for progress, approval, partial output, cancellation, completion, failure, invalid schema handling, current nested App Server error notifications, real protocol-level structured event stream evidence, a production job adapter that carries async App Server notifications into Job Manager accepted-artifact provenance, and a desktop structured-turn adapter that carries Tauri notifications into that same path, DF-212 now has local coordinator/worker thread restart recovery gated by context hash and approved artifact bundle equality, raw conversation source-of-truth rejection, plus a live App Server worker resume recheck from turn `019edc28-c179-7453-a5a5-c87e29096422` to `019edc28-f9ec-72e1-9695-1a9a2c2ca61d`, DF-213 now has local interview question/Brief cutover gates plus App Server job orchestration, accepted-output artifact persistence for production Codex provenance and follow-up turns, desktop structured-turn bridge coverage, an app-level desktop interview launcher that can persist either follow-up-required questions or ready question/Brief bundles, a question-artifact project input blocker (`question_missing_project_input`), and library-level live persisted `questions` and `brief` artifacts with input lineage, DF-214 now has local text-pipeline cutover gates plus App Server job orchestration, accepted-output artifact persistence for separate live plan/design/layout turns, approved Brief/Research handoff lineage checks, App Server strict response schemas, schema repair limits, component catalog Layout IR, shared context consistency, desktop structured-turn bridge coverage, an app-level desktop Plan/Design/Layout launcher, a production UI button wired to run the required Plan/Design/Layout turns before persistence, and one library-level live persisted Plan/Design/Layout artifact bundle, DF-221 can persist live web search evidence with Research Pack artifacts, has an app-level desktop `web_search` launcher on the production Research step, no longer sends the App Server-rejected `format: "uri"` response-schema keyword for candidate URLs, and now has completed live worker turn `019edc32-6efe-7280-a2c1-47fb1d6b0ebf` with six domains and zero blockers, DF-223 can generate claim quote/table evidence refs from captured source artifacts before approval and rejects persisted evidence refs for removed claims or sources without persisted capture artifact metadata, and DF-224 can now purge stale live evidence refs during source exclusion and write `approvedResearchPackHash` only after source capture, evidence refs, provider provenance, reinforcement blockers, and current-pack hash checks are clear. GitHub issues `#126`, `#127`, `#128`, `#129`, `#130`, `#132`, `#134`, `#139`, `#140`, and `#141` are closed with `status:done`; the remaining open issues carry `status:needs-live-evidence`. The GitHub issues still cannot all be closed because multiple acceptance criteria explicitly require app-produced Live provider runs, clean-machine validation, signed/notarized package checks, and manual QA evidence that has not been produced.

## 2026-06-21 Lane G Image Export Usage Recheck

Lane G rechecked assigned issues #147 / DF-233, #149 / DF-235, #150 / DF-240,
and #154 / DF-244 on `jacobex/live-lane-image-export-usage`. The persisted
closure record is
`docs/live-evidence/codex-image/lane-g-closure-recheck-20260621/issue-closure-evidence.json`.

Disposition:

- DF-233 remains blocked. The stored Codex image turns are successful
  completions only; no genuine live `429`/`5xx` retry, in-flight cancellation,
  or packaged restart-resume trace exists.
- DF-235 remains blocked. The regenerated v2 image and static before/after
  preservation files are present, but no packaged review UI run proves candidate
  approval or failed-regeneration preservation through the app surface.
- DF-240 remains blocked. Lane E has real text-stage turn ids and Lane D has
  image/compositor partial lineage, but the production export gate still lacks
  persisted slide-level text artifact ids/provider provenance sidecars, final PNG
  export hashes, and non-synthetic final project/export JSON package QA tied to
  compositor hashes.
- DF-244 remains blocked. Lane D proves visible image latency/count display from
  actual Codex image turns, but no persisted pre-generation user confirmation
  JSON from the packaged app surface exists.

DF-213 local update: the interview provenance gate now requires question artifacts to cite the project or initial prompt input artifact id supplied by the desktop workflow and rejects Brief artifacts that reuse the question artifact id with `brief_reused_question_artifact`. It also normalizes artifact and turn ids before reuse checks, so a Brief cannot pass by whitespace-padding a reused question artifact or turn id; those claims block with `brief_reused_question_turn` and `brief_reused_question_artifact`. A Codex `questions` turn with otherwise valid production provenance still blocks as `question_missing_project_input` when that input lineage is missing. The issue still requires packaged production UI evidence for authenticated follow-up and Brief turns plus the complete real live artifact bundle.

DF-213 local update: `createLiveInterviewReadyArtifactPatch` now preserves both ready question and Brief live artifact records when the production interview UI applies the ready Brief patch, closing the local gap where the ready path could store only Brief data while dropping the artifact bundle records. `src/lib/desktop-live-interview-artifact-patch.test.ts` covers the ready UI patch record preservation. The issue still requires packaged production UI evidence for authenticated follow-up and Brief turns plus the complete real live artifact bundle.

DF-213 local update: the interview provenance gate now rejects a Brief claim whose `answerArtifactId` reuses the live question artifact id (`brief_reused_question_answer`). This prevents one question artifact input from satisfying both the required question lineage and the required user-answer bundle lineage. The issue still requires packaged production UI evidence for authenticated follow-up and Brief turns plus the complete real live artifact bundle.

DF-213 local update: follow-up evidence now blocks as `invalid_follow_up_question` when a required missing-answer question would schedule an `interview_follow_up@v1` turn with blank question text. This prevents a live `questions` artifact from satisfying the missing-field follow-up criterion without an actionable user question. The issue still requires packaged production UI evidence for authenticated follow-up and Brief turns plus the complete real live artifact bundle.

DF-213 local update: the interview provenance gate now blocks non-canonical question/Brief artifact identities with `noncanonical_interview_identity` when any persisted artifact id, turn id, or thread id only becomes valid after trimming boundary whitespace. This prevents otherwise distinct live interview evidence from passing with padded durable identities. The issue still requires packaged production UI evidence for authenticated follow-up and Brief turns plus the complete real live artifact bundle.

DF-213 local update: `evaluateLiveInterviewCutover` now rejects question and answer input artifact ids that only become canonical after trimming whitespace with `noncanonical_interview_input_identity`. This prevents a padded answer bundle id from being silently normalized into valid follow-up or Brief lineage. The issue still requires packaged production UI evidence for authenticated follow-up and Brief turns plus the complete real live artifact bundle.

DF-212 local update: the project-thread manifest validator now rejects raw conversation source-of-truth contamination on both manifest and worker records, including nested worker resume/source metadata, persisted transcript fields, or `sourceOfTruth: "raw_conversation"`. Restart recovery remains open until a packaged desktop run persists the manifest through app storage and resumes the production UI worker thread.

DF-212 local update: `findStaleLiveContextJobs` now accepts optional context-hash evidence and marks active live jobs stale when upstream invalidation changes the frozen context hash even if the `deckContextId` string stays the same. When the current frozen context hash is known, active live jobs with the same `deckContextId` but no recorded `deckContextHash` are also stale; hashless legacy snapshots continue to use the previous id-only stale check only when the current hash is unknown. The issue remains open until a packaged desktop restart/reopen run persists the manifest through app storage and resumes the production UI worker thread.

DF-212 local update: approved artifact bundle validation now rejects blank or duplicated artifact ids on project-thread manifests and restart recovery, so a corrupted context cannot be treated as an approved worker input bundle just because every worker copied the same bad ids. Raw conversation source-of-truth detection now normalizes `sourceOfTruth` values before matching, so case-variant strings such as `RAW_CONVERSATION` cannot bypass the manifest gate. The issue remains open until a packaged desktop restart/reopen run persists the manifest through app storage and resumes the production UI worker thread.

DF-212 local update: approved artifact bundle validation now also rejects artifact ids that only become canonical after trimming whitespace. A project-thread manifest can no longer pass by giving every worker the same padded approved artifact id; the manifest blocks with `Project thread manifest has non-canonical approved artifact id ...`. The issue remains open until a packaged desktop restart/reopen run persists the manifest through app storage and resumes the production UI worker thread.

DF-212 local update: project-thread manifests now reject coordinator thread ids, worker thread ids, and worker `lastCompletedTurnId` values that only become canonical after trimming whitespace. This prevents restart recovery from treating padded durable App Server thread/turn identities as approved project-thread evidence. The issue remains open until a packaged desktop restart/reopen run persists the manifest through app storage and resumes the production UI worker thread.

DF-212 local update: `evaluateProjectThreadResumeEvidence` now rejects resumed turn ids that only become canonical after trimming whitespace with `resume_next_turn_not_canonical`, even when the turn is otherwise new and completed. This prevents padded next-turn evidence from satisfying the packaged project resume gate. The issue remains open until a packaged desktop restart/reopen run persists the manifest through app storage and resumes the production UI worker thread.

DF-214 local update: the text-pipeline provenance gate now requires stage-specific prompt versions for Deck Plan, Design System, and Layout IR artifacts, including the desktop prompt variants used by the app launcher, requires Deck Plan provenance to cite both the approved Brief artifact id and approved Live Research Pack artifact id, and rejects reused Plan/Design/Layout artifact ids with `shared_live_artifact`. It now normalizes text-pipeline artifact ids, turn ids, and input lineage ids before distinctness and handoff checks, so whitespace padding cannot disguise reused Plan/Design/Layout evidence or satisfy missing handoff inputs. Padded turn reuse blocks with `shared_live_turn`, padded artifact reuse blocks with `shared_live_artifact`, stage-wrong structured Codex artifacts block with `text_pipeline_prompt_version_mismatch`, and missing handoff inputs block with `missing_brief_input` or `missing_research_input`. The issue still requires packaged production UI evidence for authenticated Plan/Design/Layout turns and schema repair artifacts.

DF-214 local update: `createLiveTextPipelineReadyArtifactPatch` now preserves existing live artifact records and appends the ready Deck Plan, Design System, and Layout IR artifact records when the production text-pipeline UI applies the ready project patch. `src/lib/desktop-live-text-pipeline-artifact-patch.test.ts` covers this ready UI patch record preservation. The issue still requires packaged production UI evidence for authenticated Plan/Design/Layout turns and schema repair artifacts.

DF-214 local update: the text-pipeline provenance gate now rejects reused approved Brief/Research handoff ids with `shared_brief_research_input`, so one upstream artifact id cannot satisfy both Deck Plan input requirements. The issue still requires packaged production UI evidence for authenticated Plan/Design/Layout turns and schema repair artifacts.

DF-214 local update: the text-pipeline context gate now requires canonical shared `deckContextId` evidence across Deck Plan, Design System, Layout IR, and slide context refs. A bundle where every context id only matches after trimming whitespace now blocks with `deck_context_mismatch`, so five-slide context consistency cannot be satisfied by padded ids. The issue still requires packaged production UI evidence for authenticated Plan/Design/Layout turns and schema repair artifacts.

DF-214 local update: the text-pipeline provenance gate now blocks non-canonical Plan/Design/Layout artifact identities with `noncanonical_text_pipeline_identity` when any persisted artifact id, turn id, or thread id only becomes valid after trimming boundary whitespace. This prevents otherwise distinct Plan/Design/Layout evidence from passing with padded durable identities. The issue still requires packaged production UI evidence for authenticated Plan/Design/Layout turns and schema repair artifacts.

DF-214 local update: the text-pipeline provenance gate now blocks non-canonical handoff input artifact ids with `noncanonical_text_pipeline_input_identity`, so a padded approved Brief, approved Research Pack, Deck Plan, Design System, or Layout IR input id cannot be silently normalized into a valid stage handoff. The issue still requires packaged production UI evidence for authenticated Plan/Design/Layout turns and schema repair artifacts.

DF-215 local update: the live text smoke gate now requires stage-specific prompt versions across `questions`, `brief`, Deck Plan, Design System, and Layout IR, including desktop prompt variants, and blocks stage-wrong live Codex artifacts with `text_smoke_prompt_version_mismatch`. Resume evidence must also run the post-resume turn on the same thread as the previous text artifact turn or fail with `resume_thread_mismatch`, and whitespace-padded reuse of any existing text artifact turn as the post-resume `nextTurnId` now fails with `resume_reused_existing_turn`. The issue still requires a packaged production UI run that completes interview through Layout IR with live Codex-only artifacts and post-resume turn evidence.

DF-215 local update: the live text smoke gate now blocks bundles whose `questions` artifact omits project or initial-prompt input lineage (`text_smoke_missing_initial_prompt_input`) and whose Brief artifact omits a user answer-bundle input distinct from the question artifact (`text_smoke_missing_answer_input`). `src/lib/live-text-smoke-interview-lineage.test.ts` covers the false-positive case that previously returned `ready`. The issue still requires a packaged production UI run that completes interview through Layout IR with live Codex-only artifacts and post-resume turn evidence.

DF-215 local update: the live text smoke gate now blocks Deck Plan smoke bundles whose Research Pack input merely reuses the approved Brief artifact id, including whitespace-padded reuse, with `text_smoke_missing_research_input`. `src/lib/live-text-smoke-deck-plan-lineage.test.ts` covers the false-positive case that previously returned `ready`. The issue still requires a packaged production UI run that completes interview through Layout IR with live Codex-only artifacts and post-resume turn evidence.

DF-215 local update: the live text smoke gate now blocks reused text artifact ids and reused text turn ids across `questions`, `brief`, Deck Plan, Design System, and Layout IR with `duplicate_text_artifact_id` and `duplicate_text_turn_id`, including whitespace-padded reuse. `src/lib/live-text-smoke-artifact-identity.test.ts` covers the false-positive shape where lineage otherwise appears connected. The issue still requires a packaged production UI run that completes interview through Layout IR with live Codex-only artifacts and post-resume turn evidence.

DF-215 local update: the live text smoke gate now blocks non-canonical text artifact identities with `text_artifact_noncanonical_identity` when a text artifact id, turn id, or thread id only becomes valid after trimming boundary whitespace. This prevents padded durable ids from satisfying a packaged smoke bundle even when the stage lineage is otherwise connected. The issue still requires a packaged production UI run that completes interview through Layout IR with live Codex-only artifacts and post-resume turn evidence.

DF-215 local update: the live text smoke gate now blocks non-canonical text artifact input ids with `text_smoke_noncanonical_input_identity` when any project, answer-bundle, Research Pack, or stage handoff input only becomes valid after trimming boundary whitespace. This prevents padded input lineage from satisfying the packaged smoke bundle. The issue still requires a packaged production UI run that completes interview through Layout IR with live Codex-only artifacts and post-resume turn evidence.

## 2026-06-21 Lane A Runtime/Text/Research Recheck

Fresh evidence produced in this lane:

- App Server evidence bundle:
  `docs/live-evidence/runtime-text-research-live-recheck-20260620T192929Z.json`
  (`2026-06-20T19:29:29Z`,
  `sha256:c3fe5790996607ff06ffbac3422c9e2f751b2a855d304a2c8775fe09fa082a3f`).
  It records `codex-cli 0.141.0`, running App Server daemon `0.141.0`,
  smoke thread/turn `019ee682-75f6-7f63-a741-9ea51e0beba6` /
  `019ee682-7888-74a0-a5e1-29223ff1dcbb`, and structured thread/turn
  `019ee682-8819-74f3-8f5a-8e5864e54db1` /
  `019ee682-8ab0-79d0-9068-b37e428faf04`.
- Package assessment evidence bundle:
  `docs/live-evidence/runtime-text-research-package-assessment-20260620T193049Z.json`
  (`2026-06-20T19:30:49Z`,
  `sha256:74795a764c6aae6660a21bc160a65e59e725f45f7e9fba9c3aff4c6d71a4a44a`).
  It records DMG SHA-256
  `ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d`,
  the mounted bundle files, `codesign` exit `1`, `spctl` exit `1`, and detach
  exit `0`.

Assigned issue disposition from this recheck:

- DF-205 / `#131`: remains open. Authenticated Codex runtime evidence is fresh,
  but clean unauthenticated login, logout/relogin, and packaged keychain setup
  require a user-controlled clean account or clean machine.
- DF-210 / `#133`: remains open. The current App Server can run authenticated
  smoke and structured turns, but clean macOS bootstrap reproduction is still
  not present.
- DF-212 / `#135`: remains open. Protocol-level worker resume evidence exists,
  but packaged desktop restart/reopen recovery with a full approved artifact
  bundle is still blocked by missing approved live Research.
- DF-213 / `#136`: remains open. Live interview app-server turns exist, but
  the complete packaged/manual interview artifact bundle remains unrecorded.
- DF-214 / `#137`: remains open. App Server is available, but Plan/Design/Layout
  must not launch without a real approved Research Pack; the production gate now
  blocks this as `missing_approved_research`.
- DF-215 / `#138`: remains open. The full text smoke cannot complete until the
  production surface has live Research approval, Plan, Design System, Layout IR,
  and post-resume evidence.
- DF-223 / `#142`: remains open. No app-produced Research Pack with source
  capture metadata, quote/table refs, numeric or dataset evidence, and live
  provenance exists in this lane.
- DF-224 / `#143`: remains open. Packaged research approval QA is blocked by
  the current DMG failing both `codesign` and `spctl` with
  `code has no resources but signature indicates they must be present`.

## 2026-06-21 Lane D Image UI Recheck

Fresh evidence produced in this lane:

- Lane D app-surface bundle:
  `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/manifest.json`
  (`sha256:caa4036a28a40886a953a1b547059fd1073cabe35e67f73dc56418b02c02676f`).
- Review gallery artifact:
  `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/review-gallery.html`
  (`sha256:0e4ae0e0f3d58def76caebf2529d900bc54c2260f34e9d6a34f5ce9abe15e6d3`).
- Title edit/re-export artifact:
  `projects/df232_live_codex_batch/exports/svg/slide_01.svg`
  (`sha256:84b87892be4e9348c1402e348f99f9a77dfecc3ff64e1769196dca2ef8f03bef`).

Assigned issue disposition from this recheck:

- DF-233 / `#147`: remains open. Missing exact blocker: genuine live `429`/`5xx`
  retry provenance, user cancellation against an in-flight real provider request,
  and packaged restart-resume evidence.
- DF-234 / `#148`: ready to close. The bundle contains five real stored Codex
  backgrounds as compositor background layers, editable title/body/chart/source
  overlays, five review thumbnails, selected presentation preview, approve and
  regenerate controls, and title edit/re-export evidence tied to the real slide 1
  background artifact.
- DF-235 / `#149`: remains open. The bundle now contains v1/v2 before/after and
  preservation evidence, but packaged review UI approval and failed-regeneration
  preservation have not been manually driven.
- DF-240 / `#150`: remains open. Image/compositor partial lineage is present,
  but production Codex text-turn lineage, source ids per final report slide, and
  final PNG/project export QA are still missing.
- DF-244 / `#154`: remains open. Actual image latency/count display is present,
  with cost hidden because the provider sidecars did not supply cost, but there
  is no persisted pre-generation user-confirmation record from the packaged app
  surface.

## 2026-06-21 Generate Stage Live Image Product Hook

The current product branch now connects the production `codex` Generate stage
to the live Codex image path instead of the mock slide loop. The new runner
creates generating placeholders, runs approved slide bundles through the live
queue, uses the desktop Codex App Server image-generation bridge, stores PNG,
metadata, and provenance sidecars through the image artifact store contract, and
reports `live_slide_images` progress to the provider job surface. This path uses
the signed-in Codex OAuth session and does not introduce OpenAI API-key image
generation.

Assigned issue disposition:

- DF-233 / `#147`: remains open. The local production route now exercises the
  queue/session boundary, but closure still needs packaged-app real 429/5xx
  retry, in-flight cancellation, and restart-resume evidence.
- DF-241 / `#151`: remains open. The Generate-stage mock-loop blocker is
  reduced, but the signed packaged Golden Path bundle is still missing.
- DF-244 / `#154`: remains open. Generate-stage billing confirmation can now
  precede a real Codex image session, but packaged usage-summary QA with real
  image usage payloads and the persisted confirmation JSON is still missing.
- DF-247 / `#157`: remains blocked by the remaining open P0 tickets and the
  missing release evidence set.

DF-244 local update: image usage confirmation evidence now requires the exact
product storage shape `usage/<project>/<job>/image-billing-confirmation.json`.
A generic `usage/image-billing-confirmation.json` filename no longer satisfies
the summary/progress/report confirmation gate, so closure evidence must be tied
to a specific packaged app project and provider job before `Codex image usage
confirmed` can render.

DF-244 local update: image usage confirmation evidence now also rejects
`confirmationEvidencePath` values that only become valid after trimming
boundary whitespace. A padded
`usage/<project>/<job>/image-billing-confirmation.json` path now blocks as
`missing_image_billing_confirmation` and renders `Codex image usage not
confirmed`, so summary/progress/report surfaces cannot imply user-confirmed
Codex image usage from a non-canonical persisted evidence path. The issue
remains open because packaged app manual QA with real provider usage/cost
payloads and real image Codex usage disclosure evidence has not run.

DF-244 local update: image usage confirmation evidence now rejects fallback
`unknown` project or job segments even when the surrounding path shape is
otherwise canonical. `usage/unknown/unknown/image-billing-confirmation.json`
blocks as `missing_image_billing_confirmation`, preventing sanitized fallback
billing confirmations from appearing as user-confirmed Codex image usage. The
issue remains open until packaged app usage-summary manual QA captures real
provider image Codex usage payloads and the matching persisted confirmation
record from the same run.

## 2026-06-21 Generate Stage Queue Evidence Export

The current product branch now persists a DF-233 queue evidence JSON bundle for
production `codex` Generate-stage runs at
`projects/{projectId}/live-evidence/df233-image-queue-{jobId}.json`. The bundle
is written through the same artifact store as live image PNG/metadata/provenance
sidecars and records queue status, context, slides, failures, provider job
snapshots, prompt usage, retry provenance, concurrency, progress, and stored
image artifact paths. The outer provider job partial result records
`queueEvidencePath`, so the packaged app surface can hand auditors the generated
queue artifact after a real run.

Assigned issue disposition:

- DF-233 / `#147`: remains open. The local product path now exports the queue
  evidence bundle needed for closure review, but the exported bundle still must
  be produced by a real packaged Codex OAuth run containing genuine 429/5xx
  retry provenance, in-flight user cancellation, and restart-resume evidence.
- DF-241 / `#151`: remains open. The Golden Path can now reference a concrete
  queue evidence artifact from Generate, but the signed packaged Golden Path
  bundle is still missing.
- DF-247 / `#157`: remains blocked by the remaining P0 evidence requirements.

DF-233 local update: exported queue evidence now embeds the
`evaluateLiveImageQueueEvidence` validation result, so malformed retry, cancel,
or progress evidence remains visibly `blocked` inside
`df233-image-queue-{jobId}.json` instead of looking closure-ready. Provider job
recovery snapshots now also reject any malformed job entry and require
`currentJobId` to match a parsed job, preventing packaged restart-resume
evidence from silently dropping the broken cancel/retry job and recovering a
partial snapshot.

DF-233 local update: `evaluateLiveImageQueueEvidence` now rejects blank or
boundary-whitespace-padded queue context, job, prompt bundle, retry, and failure
identities with `noncanonical_queue_evidence_identity`. A queue bundle whose
padded `jobId` and `bundleId` values match each other no longer passes just
because every copied field preserves the same non-canonical string. DF-233 still
needs a real packaged run whose exported bundle contains genuine 429/5xx retry
provenance, in-flight user cancellation, and restart-resume evidence.

## 2026-06-21 Review Stage Regeneration Evidence Export

The current product branch now persists DF-235 Review-stage evidence for
selected-slide live regeneration approval and failure preservation. Approved
live candidates write
`projects/{projectId}/live-evidence/df235-slide-regeneration-review-{requestId}.json`
with outcome `approved`, the live candidate, the before/after comparison, and
the approved slide. Approved review evidence now revalidates that the
comparison matches the candidate, requested changes, preserved targets, and kept
preservation checks before the artifact is written. Eligible live Codex
regeneration failures no longer fall
back to the local mock revision path; they preserve the approved original and
write outcome `preserved_after_failure` with the provider or validation issues.
The returned `reviewEvidencePath` is now stored in
`DeckProject.liveSlideRegenerationReviewEvidence` through
`src/lib/live-slide-regeneration-review-state.ts`, so the DF-235 approval or
failure-preservation artifact remains discoverable after project DB
serialization and restart.

Assigned issue disposition:

- DF-235 / `#149`: remains open. The local product path now produces the
  approval/failure-preservation artifact that packaged QA was missing, but the
  artifact still must be captured from a real packaged review UI run.
- DF-241 / `#151`: remains open. Golden Path can now include concrete
  selected-slide regeneration review evidence, but the signed packaged Golden
  Path bundle is still missing.
- DF-247 / `#157`: remains blocked by the remaining P0 evidence requirements.

DF-235 local update: `DeckProject.liveSlideRegenerationReviewEvidence` now
accepts only canonical DF-235 writer paths shaped as
`projects/{projectId}/live-evidence/df235-slide-regeneration-review-{eventId}.json`.
Generic review filenames, template/sample/example/placeholder evidence, and
developer-local paths no longer persist into project state, so a packaged review
run must keep approval or failure-preservation evidence tied to the product
writer output before it can count toward closure.

DF-235 local update: `reviewEvidencePath` values now also reject boundary
whitespace before they can persist into
`DeckProject.liveSlideRegenerationReviewEvidence`. A padded path such as
` projects/{projectId}/live-evidence/df235-slide-regeneration-review-{eventId}.json `
no longer becomes valid through trimming, so the project state cannot treat a
non-canonical persisted review artifact path as packaged approval or
failure-preservation evidence. The issue remains open until packaged-app live
full-slide regeneration before/after approval QA and failed-regeneration
original-preservation evidence are captured from the real review UI.

DF-235 local update: `writeLiveSlideRegenerationReviewEvidence` now rejects
approved review evidence whose embedded before/after comparison drifts from the
ready candidate, requested changes, preserved targets, or kept preservation
checks. This prevents a caller from writing an `approved` DF-235 artifact just
because the final approved slide matches the candidate while the comparison
evidence would have blocked approval. DF-235 remains open until a real packaged
review UI run proves candidate approval and failed-regeneration preservation.

## 2026-06-21 Interruption Closure Manifest

The current product branch now has a DF-243 closure manifest validator in
`src/lib/live-interruption-closure-evidence.ts` and a blocked handoff manifest
at `docs/live-evidence/lane-h-20260621/df243-closure-evidence.json`. The
validator reuses the existing interruption matrix evaluator and additionally
checks that the closure manifest's image partial-resume, app cancel snapshot,
cancel-signal, approval-gate, and export-gate JSON paths match the evaluated
matrix scenarios.

DF-243 local update: `src/lib/live-interruption-closure-evidence.ts` now also
rejects closure manifests whose required artifact paths point at generic
`recovery/*.json` files outside the committed evidence bundle. These block as
`interruption_closure_artifact_outside_evidence_bundle`, so packaged QA must
copy captured interruption artifacts into `docs/live-evidence/...` before the
closure manifest can become `ready_for_close`.

DF-243 local update: `src/lib/live-interruption-closure-evidence.ts` now also
validates closure manifest identity at runtime. A manifest that names another
GitHub issue or ticket blocks with `interruption_closure_issue_mismatch` or
`interruption_closure_ticket_mismatch`, even if the matrix and artifact paths
otherwise look ready. `src/lib/live-interruption-closure-identity.ts` owns that
small guard, and `src/lib/live-interruption-closure-evidence.test.ts` covers the
false-ready path. The issue remains open until the missing packaged-app
interruption scenarios are captured as real evidence.

Assigned issue disposition:

- DF-243 / `#153`: remains open. The current manifest deliberately stays
  `blocked` because the required live image partial-resume, app-storage cancel
  snapshot, cancel-signal, approval-gate, and export-gate artifacts are still
  missing. The local improvement is that packaged QA now has one canonical JSON
  shape to fill and one validator to reject drift.
- DF-241 / `#151` and DF-247 / `#157`: remain blocked by the missing full
  Golden Path/release evidence, but can now reference a single DF-243 closure
  manifest when the live interruption matrix is eventually captured.

## 2026-06-21 Packaged Live Evidence Index Gate

The current product branch now has `src/lib/packaged-live-evidence-index.ts` as
the shared Packaged Live evidence index validator for DF-241, DF-242, DF-243,
DF-245, DF-246, and DF-247. The index is intentionally only an aggregator of
already-produced evidence JSON paths and SHA-256 digests; it does not replace
the underlying Golden Path, benchmark, interruption, packaging, manual QA, or
release-gate validators.

DF-247 local update: Packaged Live evidence index validation now rejects missing
or duplicated ticket entries, wrong GitHub issue numbers, non-canonical evidence
paths, artifact paths that name another ticket, duplicate artifact paths,
malformed SHA-256 digests, and entries marked `ready` while their child
validation result is still `blocked`. It also rejects a ready DF-247 release
index when any upstream DF-241/DF-242/DF-243/DF-245/DF-246 entry is blocked.
This prevents the final release gate handoff from treating scattered or
contradictory packaged evidence pointers as a coherent release bundle.

Assigned issue disposition:

- DF-241 / `#151`, DF-242 / `#152`, DF-243 / `#153`, DF-245 / `#155`, and
  DF-246 / `#156`: remain open. The local index gives packaged QA one shared
  manifest shape to fill after each underlying artifact is genuinely produced,
  but it does not create the real Golden Path, benchmark, interruption,
  signed/notarized clean-machine, or non-developer manual QA evidence.
- DF-247 / `#157`: remains blocked by the same open P0 evidence requirements,
  but can now reject a final release index that points at missing, duplicated,
  wrong-ticket, or still-blocked upstream evidence.

DF-246 local update: `src/lib/live-manual-qa-session-evidence.ts` now rejects
`sessionEvidencePath` values that only become valid after trimming boundary
whitespace. A padded `docs/live-evidence/manual-qa/session-20260619.json` path blocks as
`missing_manual_qa_session_evidence`, so a non-developer QA session cannot be
claimed from a non-canonical persisted bundle path. DF-246 remains open until a
real non-developer packaged-app session produces the required under-10-minute
manual QA evidence.

DF-246 local update: `src/lib/live-manual-qa-session-evidence.ts` now also
requires the observed session JSON to be copied into the committed
`docs/live-evidence/...` tree before it can count. A product-local-looking
`manual-qa/session-20260619.json` path blocks as
`missing_manual_qa_session_evidence`, preventing an unreviewable local bundle
from satisfying the release manual QA requirement. DF-246 remains open until a
real non-developer packaged-app session produces the required evidence bundle.

DF-246 local update: manual QA session evidence now rejects temporary or
observer session paths even when they live under `docs/live-evidence` and
contain `manual-qa` plus `session`. A path such as
`docs/live-evidence/manual-qa/tmp-session-20260619.json` now blocks as
`missing_manual_qa_session_evidence`, so a scratch observer bundle cannot stand
in for the persisted observed non-developer QA session artifact. DF-246 remains
open until a real non-developer packaged-app session produces the required
evidence bundle.

DF-245 local update: clean-machine step evidence paths and the separate
`cleanMachineAccountEvidencePath` now reject values that only become valid after
trimming boundary whitespace. Padded paths such as
` release-evidence/clean-machine/install-app.json ` and
` release-evidence/clean-machine/clean-macos-account.json ` block as
`missing_clean_machine_step_evidence` or
`missing_clean_machine_account_evidence`, so clean-machine release readiness
cannot be claimed from non-canonical persisted path strings. DF-245 remains open
until real clean macOS account validation, Developer ID signing, notarization,
stapling, Gatekeeper acceptance, and release-trust evidence are recorded.

DF-245 local update: `src/lib/production-packaging-evidence.ts` now rejects
dry-run archive paths as `package_not_production_mode`, even when the evidence
sets `productionMode: true`. `dist/deckforge-macos-dry-run.tgz` can still be
recorded as internal scan evidence, but it cannot satisfy production package
readiness. DF-245 remains open until a real signed/notarized production package,
Gatekeeper acceptance, release-trust evidence, and clean-machine run are
recorded.

DF-242 local update: the release gate now rejects benchmark summary rows whose
`failureDomain` is outside the DF-242 taxonomy with
`live_benchmark_invalid_failure_domain`. A malformed benchmark row such as
`revision_regeneration:billing` can no longer pass release readiness simply
because the evidence-bundle validator would have caught it earlier. DF-242
remains open until five real benchmark output bundles are produced and at least
four named provider Golden Path runs pass with `failureDomain: "none"`.

DF-205 local update: `connectImageApiKeySecret` now rejects non-keychain image
secret stores such as `equivalent_secret_store` with `LiveSecretStoreKindError`
before a compatibility API-key path can mark an image credential as stored.
This keeps the defensive legacy secret-store path aligned with the packaged OS
keychain bridge requirement while production image generation remains on Codex
OAuth. DF-205 remains open until fresh login, logout/relogin, and packaged
keychain lifecycle QA are produced from a clean account or clean machine.

DF-241 local update: Golden Path restart/reopen evidence now requires the
parsed `restartReopen.reopenedAt` timestamp to be at or after the parsed
`reportSignature.signedAt` timestamp when the signed report timestamp is valid.
A stale reopen event such as `2026-06-19T08:55:00.000Z` cannot satisfy a report
signed at `2026-06-19T09:00:00.000Z`; it blocks as
`missing_restart_reopen_evidence`. DF-241 remains open until a real signed
packaged production Golden Path run produces the full report, screenshots,
recording, validation bundle, export, and restart/reopen evidence.

DF-235 local update: Review-stage approval attempts blocked by
`regeneration_comparison_mismatch` now persist DF-235 review evidence instead
of returning `reviewEvidencePath: null`. The new
`preserved_after_approval_blocked` outcome records the live candidate, the
mismatched before/after comparison, the blocker issue code, and the preserved
approved slide, then carries the evidence path through
`DeckProject.liveSlideRegenerationReviewEvidence`. DF-235 remains open until a
real packaged review UI run proves candidate approval and failed-regeneration
original preservation from the app surface.

DF-241/DF-247 local update: live background batch uniqueness now treats Codex
OAuth `turnId` values as provider request identities for duplicate detection.
A five-slide batch can no longer reuse one Codex image turn as evidence for two
backgrounds while passing only because OpenAI-style `requestId` is absent.
DF-241 and DF-247 remain open until the signed packaged Golden Path and final
release evidence index are produced from real app runs, but this removes one
false-ready path for reusing packaged Codex image evidence.

DF-240/DF-241 local update: slide-level live generation report lineage now has
a first-class Codex image `imageTurnId` field. The formatter labels Codex image
evidence as `image turn` while retaining legacy `imageRequestId` as a fallback
for older/OpenAI-shaped rows, and final export provider-link validation matches
against the same resolved image turn identity. This keeps packaged Golden Path
and final export reports aligned with the Codex OAuth image route instead of
making reviewers populate OpenAI API-style request-id fields for Codex image
turns. DF-240/DF-241 still require the real packaged production report/export
and Golden Path bundles.

DF-235/DF-241 local update: selected-slide live regeneration provider evidence
now treats padded Codex image turn ids or legacy request ids as missing instead
of trimming them into canonical identity. A regenerated background whose
metadata/provenance sidecars both contain ` turn_codex_image_revised ` now
blocks as `missing_regeneration_request_id`, so packaged review or Golden Path
evidence cannot claim a regenerated image from trim-only provider identity.
DF-235 and DF-241 still require the packaged review UI and signed Golden Path
runs to capture the real approval/export evidence.

DF-242 local update: Live benchmark output bundle validation now accepts
Codex image `liveImageTurnIds` as the primary provider identity evidence and
keeps legacy `liveImageRequestIds` only as a fallback. A passed benchmark can
therefore cite five Codex OAuth image turns without populating OpenAI-shaped
request ids, while cross-run duplicate detection resolves the same provider
identity list before checking reuse. DF-242 remains open until five real
benchmark output bundles are produced and at least four named packaged Live
Golden Path runs pass.

DF-241 local update: Golden Path E2E provider lineage now rejects text-stage
thread/turn ids and Codex image turn ids that only become valid after trimming
boundary whitespace. Padded text turns no longer satisfy production text
lineage, and padded image turns are excluded from the validated image set,
causing `insufficient_live_image_artifacts` plus validation bundle reference
drift when the bundle cites those unvalidated image artifacts. DF-241 remains
open until the real packaged Golden Path report, screenshots, recording,
validation bundle, export, and restart/reopen evidence are captured.

DF-235/DF-241 local update: browser-stored image artifact evidence now rejects
metadata/provenance provider run ids that only become valid after trimming
boundary whitespace. A stored Codex image whose metadata and provenance sidecars
both carry ` turn_codex_image_001 ` now blocks as
`Stored image provider run id is missing.` instead of returning a padded
`providerRunId`, so review-stage regeneration and Golden Path image evidence
cannot inherit malformed browser storage identity. DF-235 and DF-241 still
require packaged app runs to capture the real regeneration and Golden Path
evidence.

DF-242 local update: Live benchmark Golden Path evidence now counts source
artifact ids, initial live image artifact ids, and regenerated image artifact
ids only when those ids are already canonical nonblank values. A benchmark
bundle whose source/image ids are valid only after trimming whitespace now
blocks as `output_bundle_golden_path_evidence_missing` instead of satisfying
the source/image floors. DF-242 remains open until real non-synthetic benchmark
output bundles are produced.

DF-242 local update: passed benchmark bundles now reject output bundle paths
that borrow another DF-242 scenario id. A `korean_business` run with a distinct
`bundles/market_research-live-output.zip` bundle path now blocks as
`output_bundle_scenario_evidence_mismatch` instead of satisfying readiness with
otherwise valid report, screenshot, source, image, and export evidence. DF-242
remains open until five real benchmark output bundles are produced and at least
four named packaged Live Golden Path runs pass.

DF-241 local update: live Golden Path regenerated image evidence now requires
the regeneration artifact to cite an initial live image with a canonical input
artifact id. A regeneration artifact whose `inputArtifactIds` only match
`live_image_3` after trimming boundary whitespace now blocks with
`missing_regenerated_live_image_artifact` instead of satisfying Golden Path
readiness. DF-241 remains open until the packaged production Golden Path run
captures the signed report, screenshots/recording, final validation bundle,
restart/reopen evidence, and export lineage.

DF-235 local update: selected-slide regeneration candidates now require the
new background provenance to cite the approved original background artifact id
as canonical input lineage. A live-looking regenerated background with a new
provider request, matching sidecars, and valid storage paths now blocks with
`regeneration_input_lineage_mismatch` if it was not produced from the selected
approved original. DF-235 remains open until the packaged Review-stage UI run
captures approval of the v2 candidate and failed-regeneration preservation
evidence through the product surface.

DF-235 live rerun: the current branch re-ran selected-slide regeneration through
the authenticated Codex App Server after the input-lineage hardening. The new
summary at
`docs/live-evidence/codex-image/df235-selected-slide-regeneration-lineage-20260622.json`
records regenerated PNG
`projects/df235_live_regeneration_lineage_20260622/slides/images/slide_003.v2.png`
with thread `019eec4f-4a6c-7832-823f-b70616583b4a`, turn
`019eec4f-4ce2-7a20-88a8-41c18590e7d7`, and provenance input lineage including
`df232_live_codex_batch_image_slide_003_v1`. This replaces the older
regeneration-only evidence for candidate lineage purposes, but DF-235 remains
open until the packaged Review-stage UI captures approval and failure
preservation evidence through the product surface.

DF-205 local update: the production image generation gate now consumes current
provider statuses in addition to the persisted image path decision. A locked
`codex` / `codexOAuth` decision whose current Codex provider status is
`requiresAuth` blocks as `provider_auth_required`, and `GenerateStage` passes
that status into the gate. A logout/disconnect lock can therefore no longer be
bypassed by reusing an older locked image path decision. DF-205 remains open
until clean login, logout/relogin, packaged keychain lifecycle, and persisted
secret-scan evidence are captured from an isolated packaged run.

DF-244 local update: live usage summary image-stage classification no longer
uses bare `stageId: "generate"` as an image-billing signal. A Codex text usage
stage labelled `generate` with complete input/output token usage now remains
ready instead of blocking with `missing_image_usage_count` and
`missing_image_billing_confirmation`; image confirmation is still required for
`openaiImage`, explicit `imageCount`, or image billing disclosure payloads.
DF-244 remains open until packaged app usage-summary manual QA captures real
image usage payloads and the matching persisted confirmation JSON from the same
run.

DF-245 local update: production packaging evidence now validates persisted JSON
payload shape in addition to evidence paths. A release-trust path only counts
when the payload is `macos_release_trust`, matches the evaluated package and
native bundle hashes, records the same Developer ID TeamIdentifier, and carries
passed zero-exit `codesign`, `notarytool`, `stapler`, and `spctl` assessment
records. Clean-machine account evidence only counts when the payload is
`clean_macos_account` with `developerAccount: false`, and each checklist path
must carry a matching `clean_machine_step` payload whose step, path, account
path, status, and timestamp align with that checklist event. Path-only,
structurally incomplete, developer-account, or cross-step payloads now block as
`missing_release_trust_evidence`, `missing_clean_machine_account_evidence`, or
`missing_clean_machine_step_evidence`. DF-245 remains open until real Developer
ID signing, notarization, stapling, Gatekeeper acceptance, and clean macOS
account evidence are captured from a packaged run.

DF-245 local update: production package archive and native macOS bundle paths
now reject transient `tmp`/`temp`/observer artifact paths before packaging
evidence can count as ready. A same-named candidate such as
`tmp/deckforge-macos-release.tgz` or `tmp/DeckForge_0.1.0_aarch64.dmg` now
blocks with `missing_production_package` or `missing_native_macos_bundle`
instead of passing as non-synthetic release evidence. DF-245 remains open until
real Developer ID signing, notarization, stapling, Gatekeeper acceptance, and
clean macOS account evidence are captured from a packaged run.

DF-233 local update: restart-resume queue evidence now rejects overlap between
`resumedArtifactIds` and `completedArtifactIdsBefore`. A restart proof can no
longer claim an image that was already completed before restart was also resumed
after restart; that evidence blocks with `invalid_restart_resume_evidence`.
DF-233 remains open until a packaged Codex OAuth image run captures genuine
429/5xx retry provenance, in-flight user cancellation, and restart-resume
evidence against real provider jobs.

DF-243 local update: interruption matrix evidence now rejects cancellation
records that reuse the app-storage recovery snapshot JSON path as the cancel
signal evidence path. The cancel scenario must carry two distinct persisted
JSON artifacts: one recovery snapshot and one cancel signal targeting the same
live job id. A path alias now blocks with `duplicate_cancel_evidence_path`
instead of looking ready. DF-243 remains open until the packaged app captures
image partial-resume, app-storage cancel snapshot, cancel signal, and
interrupted approval/export evidence from real live jobs.

DF-244 local update: image billing confirmation evidence now has to match the
current provider job id before summary approval, formatted summaries, progress
view usage items, or audit report lines can render `Codex image usage
confirmed`. A copied confirmation path such as
`usage/project-alpha/job_previous/image-billing-confirmation.json` on
`job_current` now blocks as `missing_image_billing_confirmation` and renders as
`Codex image usage not confirmed`. Regression coverage lives in
`src/lib/live-usage-billing-same-job.test.ts`. DF-244 remains open until the
packaged app captures real image usage payloads and the persisted pre-generation
confirmation JSON from the same run.

DF-244 product update: `prepareCodexImageBillingJob` now writes the confirmed
Codex OAuth image billing record into the shared project artifact store before
starting generation, using
`projects/<project>/usage/<project>/<job>/image-billing-confirmation.json`.
`GenerateStage` shares that store with the live Codex image runner, so packaged
runs can export the confirmation JSON alongside image and queue artifacts. If
the evidence write fails, the queued job is cancelled with
`evidence_write_failed` instead of proceeding with usage confirmation that
cannot be audited. DF-244 remains open until a packaged Codex image run captures
that actual JSON and regenerates the Lane D usage bundle from it.

DF-233/DF-243/DF-244 product update: local project folder export now includes
project-scoped browser artifact writes from the image artifact store. The export
preserves base64 image binaries, redacts text artifact payloads, filters out
other projects, and carries paths such as
`projects/<project>/live-evidence/df233-image-queue-<job>.json`,
`projects/<project>/live-evidence/...interruption...json`, and
`projects/<project>/usage/<project>/<job>/image-billing-confirmation.json` in a
`projectArtifactWrites` section. This removes the app-surface extraction
bottleneck for the next packaged QA run, but the three tickets remain open until
those real packaged-run artifacts are produced and copied into
`docs/live-evidence/...`.

DF-244/DF-233 live product-run smoke: the desktop Codex image structured-turn
schema now declares `additionalProperties: false`, fixing the App Server
`invalid_json_schema` failure observed before image generation. Image generation
also now requests a 600000ms structured-turn timeout, because real Codex image
runs have exceeded the previous 180s Tauri bridge limit before succeeding.
The smoke runner `scripts/run-live-codex-generate-export-smoke.ts` completed one
real Codex image turn through the product Generate runner, thread
`019eed00-dc75-7702-a706-88426836b0a0`, turn
`019eed00-dea8-70f0-acf6-2b497311136a`, duration `252553ms`, and wrote
`docs/live-evidence/codex-image/df244-generate-export-smoke-20260622/summary.json`.
The run produced
`projects/df244_generate_export_smoke_20260622/slides/images/slide_001.v1.png`,
the same-job billing confirmation JSON at
`projects/df244_generate_export_smoke_20260622/usage/df244_generate_export_smoke_20260622/job_generate_export_smoke_1/image-billing-confirmation.json`,
and DF-233 queue evidence at
`projects/df244_generate_export_smoke_20260622/live-evidence/df233-image-queue-job_generate_export_smoke_1.json`.
This proves the product Generate runner can produce and export same-project
image, billing, and queue artifacts from a real Codex image turn. DF-244 still
needs packaged UI/manual QA plus a regenerated Lane D usage display from the
persisted packaged confirmation, and DF-233 still needs genuine 429/5xx retry,
in-flight cancellation, and restart-resume evidence.

DF-245 local update: clean-machine step payloads now have to carry the same
`macosUsername` and `homeDirectory` as the clean macOS account payload. A
`codex_login` or `project_launch` step that only points at the canonical
`cleanMachineAccountEvidencePath`, but omits the account identity or names a
different macOS account, now blocks as `missing_clean_machine_step_evidence`.
Regression coverage lives in `src/lib/production-packaging-evidence-payload.test.ts`.
DF-245 remains open until real Developer ID signing, notarization/stapling,
Gatekeeper acceptance, persisted release-trust evidence, and clean macOS account
install/login/image-credential/project-launch/live-interview evidence are
captured from a packaged run.

DF-235 product evidence update: `scripts/run-df235-review-approval-evidence-smoke.ts`
replayed the lineage-valid v2 Codex regeneration candidate through
`approveReviewStageRevisionWithEvidence` and wrote approved review evidence at
`projects/df235_live_regeneration_lineage_20260622/live-evidence/df235-slide-regeneration-review-rev_df235_lineage_20260622.json`
(`sha256:cf6487e96a4b7023dd0dc47dceaef98dafb3ce80fced739fa49a65e7d5c105dc`).
The companion summary at
`docs/live-evidence/codex-image/df235-review-approval-evidence-20260622.json`
(`sha256:d3d61c3511d70ef35eb66d865f974d2ebdae7ce270f233392c3830dcd0e8a869`)
records outcome `approved`, regenerated slide 3 version 2, the approved
original artifact id, regenerated background artifact id/hash, and exact
preservation checks. This removes the product-writer approved JSON gap, but
DF-235 remains open until a packaged Review-stage UI run captures this approval
from the app surface and a failed live regeneration run proves the approved
original remains selected/exportable.

DF-244 product usage-summary update: `scripts/generate-df244-product-usage-confirmation-summary.mjs`
fed the real product-run confirmation JSON from
`df244_generate_export_smoke_20260622` through the Lane D confirmation resolver
and wrote
`docs/live-evidence/codex-image/df244-generate-export-usage-summary-20260622.json`
(`sha256:fcb9d9a17f9b4886758974d68ec310ca03dfdc5b02190e8592b0e89ff8f7b907`).
The summary now reports `confirmed_app_surface_pre_generation_codex_oauth`,
provider `codex`, `imageCount: 1`, latency `185181ms`, hidden cost, and the
same product confirmation record path. This removes the product-run usage
resolver gap, but DF-244 remains open until packaged UI manual QA captures and
displays the persisted confirmation from the same real image job.

DF-244 product-run rerun update: the same Codex OAuth/App Server Generate smoke
was rerun on 2026-06-22 and completed one real image turn on thread
`019eed41-a44d-7e22-9bbf-c1cae2f3db92`, turn
`019eed41-a6b8-7e23-838b-ccaa677a084f`, duration `185181ms`. The refreshed
summary hash is
`b96e1d1a88c0b6d4e0d397f6ad1b6411cab5736d4f06f5b58caf8f18dc082606`, the
same-job billing confirmation hash is
`87af929efa8989a12b81b661366c0e39b5aaa6228a1216c1bdf241489afeb360`, and the
generated PNG hash is
`801bb7de18f3c385d05850f75d4960b6fcc375cf072ea66f0e0c8c1e91c117b6`.
This refresh keeps DF-244 evidence current while preserving the remaining
packaged UI/manual-QA blocker.

DF-243 product cancel evidence update:
`scripts/run-df243-cancel-product-evidence-smoke.ts` now runs the real product
slide-generation queue with provider id `codex`, requests cancellation while
the in-flight slide worker returns a late image, and verifies that the queue
rejects that late output (`acceptedSlides: []`) while storing job
`live_job_cancel_product_1` as `cancelled` with `cancelRequested: true`. The
DF-243 cancel writer then persists separate app-storage recovery and cancel
signal JSON at
`projects/df243_cancel_product_smoke_20260622/live-evidence/df243-cancel-job-recovery-snapshot-cancel_product_run_20260622.json`
(`sha256:4478d369a52499dfe7de7d651fa7f0ee5caa4bfc58cb523d81401320d767aee4`)
and
`projects/df243_cancel_product_smoke_20260622/live-evidence/df243-cancel-job-cancel-signal-cancel_product_run_20260622.json`
(`sha256:49c03b6030f1a5aabe920f8757a207f64626128baac490ab15d22e0066a7cb27`).
The smoke summary at
`docs/live-evidence/codex-image/df243-cancel-product-smoke-20260622/summary.json`
(`sha256:fe4d6261d769e47e2eb06d274e0165826709c26c8f3fdfc6a82b148ea937646d`)
also records that the local project folder export includes both cancel
artifacts, and its companion matrix JSON validates as `ready`. This removes the
local product-writer cancellation gap, but DF-243 remains open until the same
cancel artifacts, image partial-resume artifacts, and interrupted approval/export
gate artifacts are captured from a packaged app run and copied into the
canonical `docs/live-evidence/...` bundle.

DF-243 product resume/gate evidence update:
`scripts/run-df243-resume-gate-product-evidence-smoke.ts` now exercises the real
DF-243 product evidence writers for image partial resume and interrupted
artifact gates. It persists a pending-to-resumed image snapshot at
`projects/df243_resume_gate_smoke_20260622/live-evidence/df243-image-partial-resume-recovery-snapshot-resume_gate_product_run_20260622.json`
(`sha256:8cdbd1b990a864e8ec86fb113da14a9a37937b9fe384a7dbde21878f2e4ddf0f`),
an interrupted gate recovery snapshot at
`projects/df243_resume_gate_smoke_20260622/live-evidence/df243-interrupted-artifact-gate-recovery-snapshot-resume_gate_product_run_20260622.json`
(`sha256:d6ba4154ce0cfb01b9827200f3697494d5db60c86c240302e58c96d4d45aa86c`),
and distinct approval/export gate JSON at
`projects/df243_resume_gate_smoke_20260622/live-evidence/df243-interrupted-artifact-gate-approval-resume_gate_product_run_20260622.json`
(`sha256:1ecb6bdc436fd8f89fc1cef8a5dc57e863361b9efd7a8dc7f90abb0c61b19cdd`)
and
`projects/df243_resume_gate_smoke_20260622/live-evidence/df243-interrupted-artifact-gate-export-resume_gate_product_run_20260622.json`
(`sha256:8ddf9c1fa329de29e6f3500264c3f30db8bbdcced315458cb03d818dba26b7f4`).
The summary at
`docs/live-evidence/codex-image/df243-resume-gate-product-smoke-20260622/summary.json`
(`sha256:e7272e0c8c0b2c1da7bc709c75c41f69cf3b50d4c8e12b212b27d0d239ddf9fe`)
records matrix result `ready` for the generated product-writer rows and confirms
that local project folder export includes the image resume snapshot plus both
gate files. This removes the local product-writer resume/gate gap, but DF-243
remains open until a packaged app run captures the same artifact classes and the
full five-scenario interruption closure bundle is copied into
`docs/live-evidence/...`.

DF-233 product queue-control evidence update:
`scripts/run-df233-queue-controls-product-evidence-smoke.ts` now runs the
product slide-generation queue and DF-233 evidence writer for retry, in-flight
cancellation, and restart-resume paths. The retry run records two transient
`server` retry events
(`server:1:100`, `server:2:200`), succeeds on attempt 3, and writes ready queue
evidence at
`projects/df233_queue_retry_smoke_20260622/live-evidence/df233-image-queue-retry_product_run_20260622.json`
(`sha256:f342cc61c9abbd4a0626ddce108e3b9499d5485bca60cff36d767de2ee96bb77`).
The cancellation run requests cancellation while the provider worker returns a
late slide 1 output, rejects that output (`acceptedSlides: []`), records
`live_job_cancel_product_1` as `cancelled` with `cancelRequested: true`, and
writes ready queue evidence at
`projects/df233_queue_cancel_smoke_20260622/live-evidence/df233-image-queue-cancel_product_run_20260622.json`
(`sha256:616fee34a2af90b0f6b2afac12f287a9fd39e766ee1575277c35f061483a1879`).
The resume run starts with slide 1 completed, generates only slide 2, includes
restart-resume proof for the pending/resumed slide 2 artifact, and writes ready
queue evidence at
`projects/df233_queue_resume_smoke_20260622/live-evidence/df233-image-queue-resume_product_run_20260622.json`
(`sha256:c5f8581f0e707780b0182307a023ca71696a0c904ad080ba0988a85bcce14e3e`).
The summary at
`docs/live-evidence/codex-image/df233-queue-controls-smoke-20260622/summary.json`
(`sha256:ef3049044d2c844673ee41973280e5fcd44953da771991616b73e371e2ce8a51`)
proves all three writer outputs validate as `ready`. DF-233 remains open until
the equivalent retry, in-flight cancellation, and restart-resume bundle is captured
from a packaged Codex OAuth image run with real provider jobs.

DF-233/DF-243 real Codex cancellation artifact update:
`src/lib/df233-df243-live-codex-cancel-artifact.test.ts` now reads the latest
real Codex OAuth cancellation smoke summary, the DF-233 queue JSON, and the
DF-243 app-storage recovery/cancel-signal JSON together. It verifies that
cancellation was requested, the Codex App Server turn recorded no protocol
errors, the late image produced no stored slide image artifacts, project-folder
export includes all three product evidence files, and both release artifacts
still preserve their packaged-run blockers. This protects the evidence bundle
from drifting into a false-ready state, but DF-233 and DF-243 remain open until
equivalent packaged-app runs capture the required retry/resume/cancel matrix.

DF-235 product failure-preservation update:
`scripts/run-df235-review-failure-preservation-smoke.ts` now drives
`runReviewStageSlideRegeneration` through the live Codex regeneration path with
a provider `503` failure. The runner preserves the approved original slide at
version 1, leaves `comparison` and `liveCandidate` null, keeps
`editConsumed: false`, and writes `preserved_after_failure` review evidence at
`projects/df235_failure_preservation_smoke_20260622/live-evidence/df235-slide-regeneration-review-rev_df235_failure_preservation_20260622.json`
(`sha256:e97ad5aa22987bb0c0f4c711d1a97b65a9f57f6c6df7213c90e1ef6afa092018`).
The summary at
`docs/live-evidence/codex-image/df235-review-failure-preservation-20260622.json`
(`sha256:3fe4be2a2fa20103409810f601d4eaa8ab88f879f1fb775531665f3dce282fc6`)
removes the local product failed-regeneration preservation writer gap. DF-235
remains open until the packaged Review-stage UI captures both approval of the
lineage-valid v2 candidate and failed-regeneration preservation from the app
surface.

DF-235 release artifact update: `src/lib/df235-release-evidence-artifact.test.ts`
now reads the lineage-valid regenerated image summary, approval summary, approval
review JSON, failure-preservation summary, and failure review JSON together. It
verifies the approved-original input lineage, review output hashes, approved
candidate outcome, preserved-after-failure outcome, and the explicit packaged
Review-stage blockers in `docs/live-evidence/release/df235-evidence.json`. This
guards against treating local product-run smoke artifacts as packaged UI QA, so
DF-235 remains blocked until the packaged Review-stage approval and failure
preservation runs are captured from the app surface.

DF-241/DF-242 candidate artifact update:
`src/lib/df241-df242-candidate-evidence-artifact.test.ts` now reads the committed
current-candidate evidence bundle and both release artifacts together. It verifies
the candidate is tied to the active dry-run package hash, still reports the
expected Golden Path blocker codes, still has zero passed live benchmarks, and
keeps the packaged Golden Path/benchmark missing evidence explicit. This prevents
the assembled local candidate from being mistaken for a packaged Golden Path or
benchmark pass.

DF-205 release artifact update: `src/lib/df205-release-evidence-artifact.test.ts`
now reads `docs/live-evidence/release/df205-evidence.json` and the active
DF-245 package recheck together. It verifies the DF-205 release artifact and
package recheck share the current package SHA, the configured secret/auth marker
scan has no hits, and clean-account login/logout, packaged Codex image capability,
packaged keychain lifecycle, and signed clean-machine leak-scan blockers remain
explicit.

DF-244 release artifact update: `src/lib/df244-release-evidence-artifact.test.ts`
now reads the product Generate smoke summary, generated usage summary, and
same-job `image-billing-confirmation.json` together. It verifies the Codex OAuth
confirmation record belongs to the same project/job as the product run, requires
`apiKeyRequired: false`, confirms the product summary hash, and keeps the packaged
pre-generation confirmation/exported usage blockers explicit.

DF-245 current package recheck update:
`scripts/generate-df245-package-recheck.mjs` records the active dry-run package,
unsigned DMG, content-scan result, and signing/Gatekeeper blockers at
`docs/live-evidence/release/df245-package-recheck-20260622.json`
(`sha256:7b9adb24eca8a6f27bedb2adbe1c5221d1ae9c1470a5e420589e391ddaf73a47`).
The active dry-run archive is
`e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6`
with 285,197 bytes, 27 archive members, and 18 app files; the unsigned DMG is
`d6849d24c5af4548b7b35e65a68a05c8d139be4b1b5504d7c3da3a3dc9e2d467`
with checksum verification `OK`. Fixed-string and credential regex scans pass
for the configured mock/secret/local-path markers, while `security
find-identity`, `codesign`, and `spctl` still prove the release remains blocked
without Developer ID signing, notarization, stapling, Gatekeeper acceptance,
and clean macOS account evidence.

DF-205 current package secret-scan update: the same current-package recheck now
backs `docs/live-evidence/release/df205-evidence.json` as DF-205 auth/secret
lifecycle evidence. It proves the active dry-run archive
`sha256:e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6`
and native app scan clean for configured Codex/OpenAI secret markers, bundled
`auth.json`, local workspace paths, assigned session/API-key patterns, and long
Bearer tokens. This removes the stale-current-package scan gap in DF-205
release evidence, but DF-205 remains open until a clean account captures fresh
login, destructive logout/relogin, post-logout provider lock/cancel state,
packaged keychain lifecycle, and clean-machine secret leak evidence.

DF-246 current-package manual QA handoff update:
`docs/live-evidence/release/df246-evidence.json`
(`sha256:b392ec1f8a2a6c791957dbad15c56a9c83866f1404e30676024f08b0bb67398d`)
now binds the manual QA checklist
(`docs/live-manual-qa-checklist.md`,
`sha256:b12fb4fa1575ee52763c1e588caf832b0a1bf7ba8a782cb5f734414bcabacbca`)
to the current package recheck
(`docs/live-evidence/release/df245-package-recheck-20260622.json`,
`sha256:7b9adb24eca8a6f27bedb2adbe1c5221d1ae9c1470a5e420589e391ddaf73a47`).
This gives the next QA lane a reviewable candidate package basis without
pretending that DF-246 has passed. DF-246 remains open until a non-developer
tester records a persisted `manual-qa` session bundle against the packaged app.

DF-247 release-gate handoff update:
`docs/live-evidence/release/df247-evidence.json`
(`sha256:8cb491fabbd0fafd16c2914fec5666726e8473f21f16b0b594b348c4b08bca69`)
now cites the updated DF-246 handoff evidence and current package recheck as
blocked release-gate inputs. The Packaged Live evidence index was refreshed with
the new DF-246 and DF-247 artifact digests. DF-247 remains open because the
upstream P0 entries, signed/clean-machine package evidence, non-developer manual
QA, and approved release decision are still missing.

DF-241/DF-242 current-candidate evidence update:
`scripts/collect-df241-df242-candidate-evidence.ts` now regenerates
`docs/live-evidence/release/df241-df242-candidate-20260622.json`
(`sha256:28803e04fdb9ec8cc98dc3b17c723fd83530f56371f8c7e3b33c11b866b3f4f1`).
The candidate assembles the existing live text lineage, three real source
artifacts, five initial Codex OAuth images, one regenerated Codex OAuth image,
and DF-240 export evidence into the DF-241 validator shape, then records the
honest blocked result. The validator now reports the remaining DF-241 gaps as
missing packaged login, title edit, signed report, step screenshots/recording,
final validation bundle, and restart/reopen evidence. The same candidate records
DF-242 as 0 of 5 passed benchmarks with all five output bundles missing. This
does not close either issue, but it removes ambiguity about which existing live
artifacts can be reused and which evidence must still come from packaged runs.

DF-245 dry-run launch smoke update:
`scripts/generate-df245-dry-run-launch-smoke.mjs` now starts the current unsigned
dry-run app launcher from `dist/deckforge-macos-dry-run/DeckForge.app`, uses a
temporary HOME, probes `http://127.0.0.1:4186/`, verifies the app shell text, and
records HTTP 200 for the root plus HTTP 200 for the packaged JS/CSS asset URLs
emitted by the HTML at
`docs/live-evidence/release/df245-dry-run-launch-smoke-20260622.json`
(`sha256:c329dc8f1234092c9f9f801ff7b8be2625b7569b91cfa5a0cbf030f4f877cc8c`).
This proves the current dry-run package can serve the app root and local
hydration assets in the developer worktree, but DF-245 remains open because this
is still unsigned, unnotarized, not Gatekeeper-accepted, and not clean-machine
evidence.

DF-245 release-trust blocker bundle update:
`scripts/generate-df245-release-trust-blocker.mjs` now persists the current
blocked trust assessment at
`docs/live-evidence/release/df245-release-trust-codesign-notarytool-stapler-spctl-20260622.json`
(`sha256:39abe3e0d644cde5797894509909f49eb8224a918ac70baaec807a0eb5361fa7`).
The bundle records `security find-identity` finding 0 valid signing identities,
`codesign` reporting the DMG is not signed, app `codesign --verify` failing,
`notarytool history` failing for missing credentials, `stapler validate`
reporting no stapled ticket, and `spctl` rejecting the DMG with
`source=no usable signature`. This removes the missing-blocker-record ambiguity
for release-trust evidence, but DF-245 still needs a passed release-trust bundle
with Developer ID signing, accepted notarization, stapling, and Gatekeeper
acceptance before it can close.

DF-247 release-gate blocker traceability update:
`docs/live-evidence/release/df247-evidence.json` now directly cites the updated
DF-245 evidence digest
`f404b948988b333e0416c700fa72ad6f66f3d0332ad6544e52dddaa706460c5f` and the
release-trust blocker bundle digest
`39abe3e0d644cde5797894509909f49eb8224a918ac70baaec807a0eb5361fa7`. The
shared packaged evidence index now records the updated DF-247 digest
`38f504a8daa3d672a489bf63d7ec198f376a5321220652f2546411ae1a9cb8e5`. This does
not unblock DF-247; it makes the final gate point at the current DF-245 blocker
record instead of only the older package recheck.

DF-243 product cancel evidence refresh:
`scripts/run-df243-cancel-product-evidence-smoke.ts` was rerun on 2026-06-22
and again produced a `ready` cancel scenario matrix with late provider output
rejected, zero accepted slides, and exported app-storage cancel snapshot plus
cancel-signal JSON. The refreshed summary at
`docs/live-evidence/codex-image/df243-cancel-product-smoke-20260622/summary.json`
has digest `9a017753267d1864549bb6ffa17cb274a26a2b7edc427a81479a5207a5c453f3`;
the refreshed recovery snapshot digest is
`8adae7e97de4ae38d74e1ad62d2e4790a8542ca38aee0a03b520e96afd3ed942`, and the
cancel-signal digest is
`2f31e94df1923921bf143c529652ce9a1209160cf01a02436acc4f6bc8bc77e7`. The
release evidence and packaged index now point at those current files. DF-243
remains open until the same cancel, image partial-resume, approval-gate, and
export-gate artifacts are captured from a packaged app run and copied into the
canonical evidence bundle.

DF-233/DF-235 product evidence refresh:
`scripts/run-df233-queue-controls-product-evidence-smoke.ts`,
`scripts/run-df235-review-approval-evidence-smoke.ts`, and
`scripts/run-df235-review-failure-preservation-smoke.ts` were rerun on
2026-06-22. DF-233 still reports ready retry, cancel, and restart-resume product
writer evidence, with refreshed retry/cancel/resume digests
`f342cc61c9abbd4a0626ddce108e3b9499d5485bca60cff36d767de2ee96bb77`,
`616fee34a2af90b0f6b2afac12f287a9fd39e766ee1575277c35f061483a1879`, and
`c5f8581f0e707780b0182307a023ca71696a0c904ad080ba0988a85bcce14e3e`.
DF-235 still reports approved review evidence for the lineage-valid v2 candidate
and preserved-after-failure evidence for the failed regeneration path; the
refreshed approval summary digest is
`d3d61c3511d70ef35eb66d865f974d2ebdae7ce270f233392c3830dcd0e8a869`.
The release evidence and packaged index now point at these current files, while
both tickets remain blocked on packaged app evidence from the UI surface.
