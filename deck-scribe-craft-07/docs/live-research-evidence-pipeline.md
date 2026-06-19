# Live Research Evidence Pipeline

Date: 2026-06-18

Scope: DF-223 Live Evidence, Claim, and Dataset Pipeline.

Status: partial local contract

## Contract added

`src/lib/live-research-evidence.ts` defines the Live-only claim evidence gate that sits after source capture and before Deck Plan handoff.

- `LiveResearchEvidenceReference` links a claim to a captured source artifact path.
- A reference must include either a quote span or a table reference.
- `ResearchPack.liveEvidenceRefs` persists those references through schema parsing and approved Research Pack artifacts.
- `ProductionWorkflowStage` forwards persisted `ResearchPack.liveEvidenceRefs` to `SourceReviewList`, so production review shows the saved quote/table evidence instead of recomputing from empty local state.
- `validateLiveResearchEvidence` emits fatal issues for claim evidence that cannot be traced back to an original source artifact.
- `source_artifact_mismatch` is fatal when a saved evidence ref points at a different artifact path than the source's captured `rawArchivePath`.
- `missing_dataset_or_numeric_evidence` is fatal when a Research Pack has no real dataset and no numeric evidence item at all.
- `major_number_metadata` also validates dataset-backed major numbers, so a claim cannot rely on a dataset whose unit, period, geography, or definition is missing.
- `unknown_reference` is fatal when a persisted evidence ref targets a claim that is absent from the Research Pack, or when numeric evidence points to a source or dataset that is absent from the Research Pack or not linked by the claim lineage.
- `getDeckPlanEligibleClaims` removes claims with fatal live evidence issues before they can be forwarded to deck planning.
- `src/lib/live-research-evidence-builder.ts` creates quote-span or table evidence refs from `EvidenceExtractionResult` items only when the linked Research source has captured artifact metadata.
- `src/lib/live-research-pack-builder.ts` builds a Research Pack from app-produced captured source metadata and evidence extraction results, then attaches `ResearchPack.liveEvidenceRefs` before the approval gate runs.

## Acceptance mapping

| DF-223 acceptance criterion                                                    | Local contract evidence                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Each claim has a source artifact and quote span or table reference.            | `LiveResearchEvidenceReference` requires `sourceArtifactPath` plus `kind: "quote_span"` with `quoteSpan`, or `kind: "table_reference"` with `tableRef`.                                                             |
| Major numbers without unit, period, geography, or definition require review.   | `major_number_metadata` is fatal for incomplete numeric evidence and incomplete dataset metadata on dataset-backed major-number claims.                                                                             |
| At least one real dataset or numeric evidence exists.                          | `missing_dataset_or_numeric_evidence` is fatal when the whole Research Pack has no dataset and no numeric evidence, and `missing_number_dataset` is fatal when a major-number claim has no dataset-backed evidence. |
| Source-less claims are not passed to Deck Plan.                                | `getDeckPlanEligibleClaims` excludes claims with fatal evidence issues.                                                                                                                                             |
| Search-summary-only claims without original source content cannot be approved. | `summary_without_original` is fatal when a factual claim has no original artifact quote/table reference.                                                                                                            |
| Numeric evidence must roundtrip through the claim's source/dataset lineage.    | `unknown_reference` is fatal when persisted evidence targets an unknown claim, or numeric evidence uses a source or dataset outside the claim's linked source and dataset ids.                                      |
| Saved evidence refs must point at the captured source artifact.                | `source_artifact_mismatch` is fatal when a persisted evidence ref path does not match `ResearchPack.sources[].capture.rawArchivePath`.                                                                              |

## Claim-to-source roundtrip

The local claim-to-source roundtrip is covered by `src/lib/live-research-evidence.test.ts`:

- source artifact quote span and dataset evidence passes;
- search summary without original artifact evidence fails with `summary_without_original`;
- malformed major-number metadata fails with `major_number_metadata`;
- dataset-backed major numbers with incomplete dataset metadata fail with `major_number_metadata`;
- persisted evidence refs pointing at unknown claims and numeric evidence pointing outside the claim source/dataset lineage fail with `unknown_reference`;
- missing dataset/numeric evidence fails with `missing_number_dataset`;
- packs with no dataset and no numeric evidence fail with `missing_dataset_or_numeric_evidence`;
- table references are accepted as an alternative to quote spans.
- captured source artifact path mismatches fail with `source_artifact_mismatch`.

## Verification

- `bun test src/lib/live-research-evidence.test.ts src/lib/live-research-evidence-ref-targets.test.ts src/lib/live-research-evidence-builder.test.ts src/lib/live-research-pack-builder.test.ts src/lib/research-pack.test.ts src/components/deck/ProductionWorkflowStage.integration.test.tsx` passes.
- `bun run typecheck` passes.
- `bun run lint` passes with the existing six React Fast Refresh warnings only.

## Remaining Live work

DF-223 is not ready to close. The local pipeline can now generate and persist `ResearchPack.liveEvidenceRefs` from captured source artifacts and evidence extraction results, but it still needs a recorded authenticated packaged-app Research run plus review using real live captures.
