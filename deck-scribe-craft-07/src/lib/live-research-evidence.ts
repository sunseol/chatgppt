import type { QuoteSpan, TableReference } from "./evidence-extractor";
import { validateEvidenceRefClaimTargets } from "./live-research-evidence-ref-targets";
import { validateClaimNumberEvidence } from "./live-research-number-evidence";
import { validatePackDatasetOrNumericEvidence } from "./live-research-evidence-pack-requirements";
import { validateClaimOriginalEvidence } from "./live-research-source-artifact-evidence";
import type { Claim, ResearchPack } from "./research-types";

export type LiveResearchEvidenceIssueCode =
  | "summary_without_original"
  | "missing_source_artifact"
  | "source_artifact_mismatch"
  | "missing_quote_or_table"
  | "missing_number_dataset"
  | "missing_dataset_or_numeric_evidence"
  | "major_number_metadata"
  | "duplicate_evidence_reference"
  | "noncanonical_evidence_reference"
  | "unknown_reference";

export type LiveResearchEvidenceIssue = {
  readonly code: LiveResearchEvidenceIssueCode;
  readonly severity: "fatal";
  readonly message: string;
  readonly claimId?: string;
  readonly sourceId?: string;
  readonly datasetId?: string;
};

export type QuoteSpanEvidenceReference = {
  readonly id: string;
  readonly claimId: string;
  readonly sourceId: string;
  readonly sourceArtifactPath: string;
  readonly kind: "quote_span";
  readonly quoteSpan: QuoteSpan;
  readonly datasetId?: string;
};

export type TableEvidenceReference = {
  readonly id: string;
  readonly claimId: string;
  readonly sourceId: string;
  readonly sourceArtifactPath: string;
  readonly kind: "table_reference";
  readonly tableRef: TableReference;
  readonly datasetId?: string;
};

export type LiveResearchEvidenceReference = QuoteSpanEvidenceReference | TableEvidenceReference;

export type LiveResearchEvidenceReport = {
  readonly valid: boolean;
  readonly issues: readonly LiveResearchEvidenceIssue[];
  readonly fatalIssues: readonly LiveResearchEvidenceIssue[];
};

export function validateLiveResearchEvidence(input: {
  readonly pack: ResearchPack;
  readonly evidenceRefs: readonly LiveResearchEvidenceReference[];
}): LiveResearchEvidenceReport {
  const issues: LiveResearchEvidenceIssue[] = [];
  const claimIds = new Set(input.pack.claims.map((claim) => claim.id));
  const sourceIds = new Set(input.pack.sources.map((source) => source.id));
  const sourceArtifactPathsById = new Map(
    input.pack.sources.map((source) => [source.id, source.capture?.rawArchivePath] as const),
  );
  const datasetsById = new Map(input.pack.datasets.map((dataset) => [dataset.id, dataset]));
  const datasetIds = new Set(datasetsById.keys());
  const refsByClaim = groupEvidenceRefsByClaim(input.evidenceRefs);

  issues.push(...validatePackDatasetOrNumericEvidence(input.pack));
  issues.push(...validateEvidenceRefClaimTargets(input.evidenceRefs, claimIds));

  for (const claim of input.pack.claims) {
    const evidenceRefs = refsByClaim.get(claim.id) ?? [];
    validateClaimOriginalEvidence(
      claim,
      evidenceRefs,
      sourceIds,
      sourceArtifactPathsById,
      datasetIds,
      issues,
    );
    validateClaimNumericEvidenceReferences(claim, sourceIds, datasetIds, issues);
    validateClaimNumberEvidence(claim, evidenceRefs, datasetsById, issues);
  }

  const fatalIssues = issues.filter((issue) => issue.severity === "fatal");
  return { valid: fatalIssues.length === 0, issues, fatalIssues };
}

export function getDeckPlanEligibleClaims(
  pack: ResearchPack,
  report: LiveResearchEvidenceReport,
): Claim[] {
  const blockedClaimIds = new Set(
    report.fatalIssues.map((issue) => issue.claimId).filter((claimId) => claimId !== undefined),
  );
  return pack.claims.filter((claim) => !blockedClaimIds.has(claim.id));
}

function validateClaimNumericEvidenceReferences(
  claim: Claim,
  sourceIds: ReadonlySet<string>,
  datasetIds: ReadonlySet<string>,
  issues: LiveResearchEvidenceIssue[],
) {
  for (const numericEvidence of claim.numericEvidence) {
    if (
      numericEvidence.sourceId &&
      (!sourceIds.has(numericEvidence.sourceId) ||
        !claim.sourceIds.includes(numericEvidence.sourceId))
    ) {
      issues.push(
        issue({
          code: "unknown_reference",
          claimId: claim.id,
          sourceId: numericEvidence.sourceId,
          message: `Unknown or unlinked numeric evidence source: ${numericEvidence.sourceId}`,
        }),
      );
    }
    if (
      numericEvidence.datasetId &&
      (!datasetIds.has(numericEvidence.datasetId) ||
        !claim.datasetIds.includes(numericEvidence.datasetId))
    ) {
      issues.push(
        issue({
          code: "unknown_reference",
          claimId: claim.id,
          datasetId: numericEvidence.datasetId,
          message: `Unknown or unlinked numeric evidence dataset: ${numericEvidence.datasetId}`,
        }),
      );
    }
  }
}

function groupEvidenceRefsByClaim(
  evidenceRefs: readonly LiveResearchEvidenceReference[],
): ReadonlyMap<string, readonly LiveResearchEvidenceReference[]> {
  const refsByClaim = new Map<string, LiveResearchEvidenceReference[]>();
  for (const evidenceRef of evidenceRefs) {
    const existing = refsByClaim.get(evidenceRef.claimId);
    if (existing) {
      existing.push(evidenceRef);
      continue;
    }
    refsByClaim.set(evidenceRef.claimId, [evidenceRef]);
  }
  return refsByClaim;
}

function issue(input: {
  readonly code: LiveResearchEvidenceIssueCode;
  readonly message: string;
  readonly claimId?: string;
  readonly sourceId?: string;
  readonly datasetId?: string;
}): LiveResearchEvidenceIssue {
  return { ...input, severity: "fatal" };
}
