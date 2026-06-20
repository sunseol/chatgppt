# Live Research Approval Gate

Date: 2026-06-19

Scope: DF-224 Live Research Review and Approval Gate.

Status: partial local contract

## Contract added

`src/lib/live-research-approval-gate.ts` combines the DF-223 live evidence gate with provider provenance validation before a Research Pack can be treated as approval-ready.

- Missing provider provenance blocks approval with `missing_provenance`.
- Provider provenance must name the exact canonical current Research Pack artifact
  id and a `live_research_pack@...` prompt version; padded, unrelated, or
  stage-wrong artifact provenance blocks approval with
  `research_pack_provenance_mismatch`.
- Any reviewed source without persisted live capture metadata blocks approval with
  `source_missing_live_capture`.
- Incomplete or trim-normalized live capture metadata blocks approval with
  `source_capture_incomplete`.
- Missing original source evidence blocks approval with DF-223 evidence issue codes such as `summary_without_original`.
- Pending source-strengthening requests block approval with `pending_reinforcement_request`.
- Complete evidence plus complete production Codex provenance returns `kind: "ready"`.
- `ResearchPack.provenanceLineage` persists provider lineage through Research Pack parsing and approved Research Pack artifacts.
- `createLiveResearchApprovedHash` hashes the current Research Pack content with `approvedHash` removed, so approval cannot be replayed after source, evidence, or provenance changes.
- `createLiveResearchDeckPlanInput` forwards only `researchPackId` and `approvedResearchPackHash` to the downstream live deck-plan input, and returns no handoff for stale approved hashes or approved hashes whose persisted evidence/provenance no longer pass the live approval gate.
- `src/lib/live-research-approval-action.ts` creates the production approval patch only after the live gate is ready, writes `ResearchPack.approvedHash`, returns the DF-214 deck-plan input containing `approvedResearchPackHash`, and creates an approved research artifact record at `projects/{projectId}/research/research.v{version}.json`.
- `src/lib/desktop-live-text-pipeline-jobs.ts` includes the same `researchPackId` and `approvedResearchPackHash` in the live Deck Plan App Server prompt, so DF-214 receives the approved Research Pack hash as an actual turn input rather than only a local return value.

## Review UI contract

`src/components/deck/ResearchSourcePreview.tsx` now accepts live source metadata and evidence references so the review surface can show:

- actual URL;
- source type;
- `fetched_at`;
- quote span or table reference;
- claim confidence;
- `출처 제외` action.

Approval depends on complete `ResearchPack.sources[].capture`, so a source must carry canonical HTTP(S) `originalUrl` and `finalUrl`, positive `fetchedAt`, successful status metadata, canonical MIME metadata, canonical archive paths, canonical hashes, and version before it can be approved. URLs, MIME values, archive paths, or hashes that only become valid after trimming whitespace are incomplete capture metadata.

`src/lib/research-review-actions.ts` records review decisions in `ResearchReviewState`: source exclusion removes dependent datasets, charts, numeric evidence, persisted live evidence refs, stale approval hashes, and stale provider provenance. Numeric evidence is removed when either its source is excluded or its dataset was removed by the exclusion, so a retained source cannot keep a number alive through a deleted dataset. Reinforcement request and resolution review mutations also clear prior provider provenance, so stale `ResearchPack.provenanceLineage` cannot unlock approval after the reviewed pack changes. The existing `ReinforcementRequest` surface remains available for source strengthening requests, and `ResearchStage` wires actual source-exclusion and reinforcement actions that reopen approval review.

`src/components/deck/ProductionResearchReview.tsx` now renders a persisted Research Pack on the production research step when one exists. It passes persisted `ResearchPack.liveEvidenceRefs` and `ResearchPack.provenanceLineage` into `evaluateLiveResearchApprovalGate` instead of empty gate inputs, shows `SourceReviewList` with actual URL, source type, `fetched_at`, quote/table evidence, claim confidence, preserved `ResearchPack.sources[].capture` metadata, and saved evidence references, exposes source exclusion controls and a production reinforcement request control, renders a `Live research approval gate` blocker summary, and enables `Live Research Pack 승인` only when evidence/provenance is ready.

When the ready-state approval action runs, it records the approved research artifact record in the stage approval log instead of relying on a generic inferred research artifact id. That makes the DF-214 handoff auditable through the same artifact id/version/path contract as other approved stage outputs.

## Verification

- `bun test src/lib/live-research-approval-gate.test.ts src/lib/live-research-source-capture-gate.test.ts` passes: 7 tests.
- `bun test src/lib/live-research-approval-action.test.ts` passes: 2 tests.
- `bun test src/lib/live-research-approval-provenance-identity.test.ts src/lib/live-research-approval-gate.test.ts src/lib/live-research-approval-action.test.ts` passes: 12 tests.
- `bun test src/lib/desktop-live-text-pipeline-workflow.test.ts` passes and locks the Deck Plan turn handoff prompt containing `approvedResearchPackHash`.
- `bun test src/lib/research-review-actions.test.ts` passes: 3 tests.
- `bun test src/lib/research-pack.test.ts` passes: 7 tests.
- `bun test src/components/deck/ResearchStage.integration.test.tsx` passes: 5 tests.
- `bun test src/components/deck/ProductionWorkflowStage.integration.test.tsx` passes and locks production review rendering for actual URL, source type, `fetched_at`, quote span, claim confidence, source exclusion, reinforcement, and ready-state approval.
- `bun test src/lib/research-pack.test.ts src/lib/research-review-actions.test.ts src/lib/live-research-approval-gate.test.ts src/components/deck/ResearchStage.integration.test.tsx src/components/deck/ProductionWorkflowStage.integration.test.tsx` passes: 24 tests.
- `bun run typecheck` passes.
- `bun run lint` passes with the existing six React Fast Refresh warnings only.

## Remaining Live work

DF-224 is not ready to close. The review UI and approval gate contracts exist locally, and production can now display a persisted Research Pack, source exclusion/reinforcement controls, approval blockers, saved canonical source capture metadata, saved evidence references, saved provider provenance, and a ready-state approval action that writes a current-content `approvedResearchPackHash` plus an approved research artifact record for DF-214. Source exclusion now also purges numeric evidence that survives only through a removed dataset, preventing stale numbers from appearing review-ready after the source decision, and review mutations clear stale provider provenance before any later approval attempt. Approval also requires saved provider provenance for the exact canonical current Research Pack artifact id and a `live_research_pack@...` prompt version, so provenance for a different artifact, whitespace-padded artifact, or another live stage prompt cannot unlock the DF-214 handoff. A non-simulated packaged-app live research approval manual QA run is still required.

## 2026-06-21 KST lane evidence update

This ticket remains hard-blocked on packaged-app research approval manual QA.
The mounted `release-artifacts/DeckForge_0.1.0_aarch64.dmg` package failed both
`codesign --verify --deep --strict --verbose=2` and `spctl --assess --type
execute --verbose=4` against `/Volumes/DeckForge/DeckForge.app` with `code has
no resources but signature indicates they must be present`. Without a launchable
packaged app and without a persisted app-produced Research Pack carrying source
capture metadata, `ResearchPack.liveEvidenceRefs`, and `ResearchPack.provenanceLineage`,
the required non-simulated approval QA cannot be completed. See
`docs/live-research-lane-blockers-2026-06-21.md`.
