import type { QuoteSpan, TableReference } from "./evidence-extractor";
import { validateClaimNumberEvidence } from "./live-research-number-evidence";
import type { Claim, ResearchPack } from "./research-types";

export type LiveResearchEvidenceIssueCode =
  | "summary_without_original"
  | "missing_source_artifact"
  | "missing_quote_or_table"
  | "missing_number_dataset"
  | "missing_dataset_or_numeric_evidence"
  | "major_number_metadata"
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
  const sourceIds = new Set(input.pack.sources.map((source) => source.id));
  const datasetsById = new Map(input.pack.datasets.map((dataset) => [dataset.id, dataset]));
  const datasetIds = new Set(datasetsById.keys());
  const refsByClaim = groupEvidenceRefsByClaim(input.evidenceRefs);

  validatePackDatasetOrNumericEvidence(input.pack, issues);

  for (const claim of input.pack.claims) {
    const evidenceRefs = refsByClaim.get(claim.id) ?? [];
    validateClaimOriginalEvidence(claim, evidenceRefs, sourceIds, datasetIds, issues);
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

function validatePackDatasetOrNumericEvidence(
  pack: ResearchPack,
  issues: LiveResearchEvidenceIssue[],
) {
  if (pack.datasets.length > 0 || pack.claims.some((claim) => claim.numericEvidence.length > 0)) {
    return;
  }
  issues.push(
    issue({
      code: "missing_dataset_or_numeric_evidence",
      message: "Live Research Pack requires at least one real dataset or numeric evidence item.",
    }),
  );
}

function validateClaimOriginalEvidence(
  claim: Claim,
  evidenceRefs: readonly LiveResearchEvidenceReference[],
  sourceIds: ReadonlySet<string>,
  datasetIds: ReadonlySet<string>,
  issues: LiveResearchEvidenceIssue[],
) {
  if (isFactualClaim(claim) && evidenceRefs.length === 0) {
    issues.push(
      issue({
        code: "summary_without_original",
        claimId: claim.id,
        message: "Live claims require an original source artifact quote or table reference.",
      }),
    );
  }

  for (const evidenceRef of evidenceRefs) {
    if (!sourceIds.has(evidenceRef.sourceId) || !claim.sourceIds.includes(evidenceRef.sourceId)) {
      issues.push(
        issue({
          code: "unknown_reference",
          claimId: claim.id,
          sourceId: evidenceRef.sourceId,
          message: `Unknown or unlinked evidence source: ${evidenceRef.sourceId}`,
        }),
      );
    }
    if (!evidenceRef.sourceArtifactPath.trim()) {
      issues.push(
        issue({
          code: "missing_source_artifact",
          claimId: claim.id,
          sourceId: evidenceRef.sourceId,
          message: "Live evidence must point to the captured original source artifact.",
        }),
      );
    }
    if (!hasOriginalReference(evidenceRef)) {
      issues.push(
        issue({
          code: "missing_quote_or_table",
          claimId: claim.id,
          sourceId: evidenceRef.sourceId,
          message: "Live evidence must include a valid quote span or table reference.",
        }),
      );
    }
    if (evidenceRef.datasetId && !datasetIds.has(evidenceRef.datasetId)) {
      issues.push(
        issue({
          code: "unknown_reference",
          claimId: claim.id,
          datasetId: evidenceRef.datasetId,
          message: `Unknown evidence dataset: ${evidenceRef.datasetId}`,
        }),
      );
    }
  }
}

function hasOriginalReference(evidenceRef: LiveResearchEvidenceReference): boolean {
  if (evidenceRef.kind === "quote_span") {
    return (
      evidenceRef.quoteSpan.start >= 0 &&
      evidenceRef.quoteSpan.end > evidenceRef.quoteSpan.start &&
      evidenceRef.quoteSpan.text.trim().length > 0
    );
  }
  return (
    evidenceRef.tableRef.tableId.trim().length > 0 &&
    evidenceRef.tableRef.rowKey.trim().length > 0 &&
    evidenceRef.tableRef.columnKey.trim().length > 0
  );
}

function isFactualClaim(claim: Claim): boolean {
  return claim.status !== "assumption" && claim.confidence !== "assumption";
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
