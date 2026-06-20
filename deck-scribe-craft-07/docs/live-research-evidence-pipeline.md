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
- `missing_source_artifact` is fatal when a saved evidence ref has no source artifact path or the linked Research source lacks persisted `capture.rawArchivePath` metadata.
- `source_artifact_mismatch` is fatal when a saved evidence ref points at a
  different artifact path than the source's captured `rawArchivePath`, or when
  either side only becomes the same path after trimming whitespace.
- `missing_dataset_or_numeric_evidence` is fatal when a Research Pack has no real dataset and no numeric evidence item at all.
- `major_number_metadata` also validates dataset-backed major numbers, so a claim cannot rely on a dataset whose unit, period, geography, or definition is missing.
- `duplicate_evidence_reference` is fatal when persisted evidence refs reuse the same id across the Research Pack.
- `noncanonical_evidence_reference` is fatal when a persisted evidence ref id, claim id, source id, or dataset id only becomes usable after trimming whitespace.
- `unknown_reference` is fatal when a persisted evidence ref targets a claim that is absent from the Research Pack, when an evidence ref names a dataset outside the claim's dataset lineage, when numeric evidence points to a source or dataset that is absent from the Research Pack or not linked by the claim lineage, or when a dataset-backed major number uses a dataset whose `sourceIds` do not include any of the claim's source artifact ids.
- `getDeckPlanEligibleClaims` removes claims with fatal live evidence issues before they can be forwarded to deck planning.
- `buildDeckPlanPrompt` also excludes claims with fatal live evidence issues whenever `ResearchPack.liveEvidenceRefs` is present, so a direct Deck Plan prompt build cannot admit source-summary/no-original claims into Usable Research Claims.
- `src/lib/live-research-evidence-builder.ts` creates quote-span or table evidence refs from `EvidenceExtractionResult` items only when the linked Research source has captured artifact metadata.
- `src/lib/live-research-pack-builder.ts` builds a Research Pack from app-produced captured source metadata and evidence extraction results, then attaches `ResearchPack.liveEvidenceRefs` before the approval gate runs.

## Acceptance mapping

| DF-223 acceptance criterion                                                    | Local contract evidence                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Each claim has a source artifact and quote span or table reference.            | `LiveResearchEvidenceReference` requires `sourceArtifactPath` plus `kind: "quote_span"` with `quoteSpan`, or `kind: "table_reference"` with `tableRef`; the linked source must also preserve `capture.rawArchivePath`. |
| Major numbers without unit, period, geography, or definition require review.   | `major_number_metadata` is fatal for incomplete numeric evidence and incomplete dataset metadata on dataset-backed major-number claims.                                                                             |
| At least one real dataset or numeric evidence exists.                          | `missing_dataset_or_numeric_evidence` is fatal when the whole Research Pack has no dataset and no numeric evidence, and `missing_number_dataset` is fatal when a major-number claim has no dataset-backed evidence. |
| Source-less claims are not passed to Deck Plan.                                | `getDeckPlanEligibleClaims` and `buildDeckPlanPrompt` exclude claims with fatal evidence issues.                                                                                                                    |
| Search-summary-only claims without original source content cannot be approved. | `summary_without_original` is fatal when a factual claim has no original artifact quote/table reference.                                                                                                            |
| Numeric evidence must roundtrip through the claim's source/dataset lineage.    | `unknown_reference` is fatal when persisted evidence targets an unknown claim, evidence refs name datasets outside the claim's linked dataset ids, numeric evidence uses a source or dataset outside the claim's linked ids, or a dataset-backed major number uses a dataset whose `sourceIds` do not include the claim source artifact ids. |
| Saved evidence refs must point at the captured source artifact.                | `source_artifact_mismatch` is fatal when a persisted evidence ref path does not exactly match the canonical `ResearchPack.sources[].capture.rawArchivePath`, including whitespace-padded paths that only match after trimming. |
| Saved evidence refs cannot invent source artifact paths.                       | `missing_source_artifact` is fatal when a persisted evidence ref names a source whose `ResearchPack.sources[].capture.rawArchivePath` is missing.                                                                   |
| Saved evidence refs must have unique identities.                               | `duplicate_evidence_reference` is fatal when two persisted evidence refs reuse one id.                                                                                                                              |
| Saved evidence refs must use canonical identities.                             | `noncanonical_evidence_reference` is fatal when persisted ref ids, claim ids, source ids, or dataset ids contain trim-only identity evidence.                                                                       |

## Claim-to-source roundtrip

The local claim-to-source roundtrip is covered by `src/lib/live-research-evidence.test.ts`:

- source artifact quote span and dataset evidence passes;
- search summary without original artifact evidence fails with `summary_without_original`;
- malformed major-number metadata fails with `major_number_metadata`;
- dataset-backed major numbers with incomplete dataset metadata fail with `major_number_metadata`;
- persisted evidence refs pointing at unknown claims, evidence refs naming datasets outside the claim dataset lineage, numeric evidence pointing outside the claim source/dataset lineage, and major-number datasets sourced outside the claim source artifacts fail with `unknown_reference`;
- missing dataset/numeric evidence fails with `missing_number_dataset`;
- packs with no dataset and no numeric evidence fail with `missing_dataset_or_numeric_evidence`;
- table references are accepted as an alternative to quote spans.
- evidence refs for sources without captured artifact metadata fail with `missing_source_artifact`.
- captured source artifact path mismatches and whitespace-padded path matches fail with `source_artifact_mismatch`.
- duplicate persisted evidence ref ids fail with `duplicate_evidence_reference`.
- persisted evidence ref ids, claim ids, source ids, or dataset ids that only become valid after trimming whitespace fail with `noncanonical_evidence_reference`.
- direct Deck Plan prompt construction excludes live claims that lack original quote/table evidence refs.

## Verification

- `bun test src/lib/deck-plan-prompt.test.ts src/lib/live-research-evidence.test.ts src/lib/live-research-evidence-ref-targets.test.ts src/lib/live-research-evidence-builder.test.ts src/lib/live-research-pack-builder.test.ts src/lib/research-pack.test.ts src/components/deck/ProductionWorkflowStage.integration.test.tsx` passes.
- `bun run typecheck` passes.
- `bun run lint` passes with the existing six React Fast Refresh warnings only.

## Remaining Live work

DF-223 is not ready to close. The local pipeline can now generate and persist `ResearchPack.liveEvidenceRefs` from captured source artifacts and evidence extraction results, but it still needs a recorded authenticated packaged-app Research run plus review using real live captures.

## 2026-06-21 KST lane evidence update

This ticket remains hard-blocked on packaged-app Research Pack evidence. The
Research lane mounted `release-artifacts/DeckForge_0.1.0_aarch64.dmg`
read-only and confirmed its SHA-256 matches the committed checksum, but both
`codesign --verify --deep --strict --verbose=2 /Volumes/DeckForge/DeckForge.app`
and `spctl --assess --type execute --verbose=4 /Volumes/DeckForge/DeckForge.app`
failed with `code has no resources but signature indicates they must be
present`. The mounted bundle was detached after inspection.

No persisted app-produced live Research Pack artifact exists in
`release-artifacts`, and the current live `web_search` workflow only creates
candidate sources without captured source metadata, claims, datasets, or
`ResearchPack.liveEvidenceRefs`. See
`docs/live-research-lane-blockers-2026-06-21.md` for the exact blocker evidence.

Lane A rechecked the independent runtime and package evidence:

- App Server evidence:
  `docs/live-evidence/runtime-text-research-live-recheck-20260620T192929Z.json`,
  digest
  `sha256:c3fe5790996607ff06ffbac3422c9e2f751b2a855d304a2c8775fe09fa082a3f`,
  smoke turn `019ee682-7888-74a0-a5e1-29223ff1dcbb`, structured turn
  `019ee682-8ab0-79d0-9068-b37e428faf04`.
- Package assessment evidence:
  `docs/live-evidence/runtime-text-research-package-assessment-20260620T193049Z.json`,
  digest
  `sha256:74795a764c6aae6660a21bc160a65e59e725f45f7e9fba9c3aff4c6d71a4a44a`,
  DMG SHA-256
  `ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d`,
  `codesign` and `spctl` both exit `1` with
  `code has no resources but signature indicates they must be present`.

DF-223 remains open because no app-produced Research Pack with source capture
metadata, claim quote/table refs, numeric or dataset evidence, and live
Research Pack provenance exists in the lane.
