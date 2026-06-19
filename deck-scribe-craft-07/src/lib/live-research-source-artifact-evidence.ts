import type {
  LiveResearchEvidenceIssue,
  LiveResearchEvidenceIssueCode,
  LiveResearchEvidenceReference,
} from "./live-research-evidence";
import type { Claim } from "./research-types";

export function validateClaimOriginalEvidence(
  claim: Claim,
  evidenceRefs: readonly LiveResearchEvidenceReference[],
  sourceIds: ReadonlySet<string>,
  sourceArtifactPathsById: ReadonlyMap<string, string | undefined>,
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
    validateEvidenceRefSource(claim, evidenceRef, sourceIds, sourceArtifactPathsById, issues);
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

function validateEvidenceRefSource(
  claim: Claim,
  evidenceRef: LiveResearchEvidenceReference,
  sourceIds: ReadonlySet<string>,
  sourceArtifactPathsById: ReadonlyMap<string, string | undefined>,
  issues: LiveResearchEvidenceIssue[],
) {
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

  const capturedArtifactPath = sourceArtifactPathsById.get(evidenceRef.sourceId);
  if (!evidenceRef.sourceArtifactPath.trim() || !capturedArtifactPath?.trim()) {
    issues.push(
      issue({
        code: "missing_source_artifact",
        claimId: claim.id,
        sourceId: evidenceRef.sourceId,
        message: "Live evidence must point to a persisted captured source artifact.",
      }),
    );
    return;
  }

  if (evidenceRef.sourceArtifactPath !== capturedArtifactPath) {
    issues.push(
      issue({
        code: "source_artifact_mismatch",
        claimId: claim.id,
        sourceId: evidenceRef.sourceId,
        message: "Live evidence must reference the source's captured original artifact path.",
      }),
    );
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

function issue(input: {
  readonly code: LiveResearchEvidenceIssueCode;
  readonly message: string;
  readonly claimId?: string;
  readonly sourceId?: string;
  readonly datasetId?: string;
}): LiveResearchEvidenceIssue {
  return { ...input, severity: "fatal" };
}
