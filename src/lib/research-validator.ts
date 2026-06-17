import {
  canSupportMajorClaim,
  canSupportMajorNumber,
  getUncertaintyPolicy,
} from "./research-source-policy";
import type {
  Claim,
  NumericEvidence,
  ResearchDataset,
  ResearchPack,
  Source,
} from "./research-types";

export type ResearchValidationSeverity = "fatal" | "warning" | "info";
export type ResearchValidationCode =
  | "missing_evidence"
  | "label_required"
  | "major_number_metadata"
  | "weak_source_grade"
  | "unknown_reference";

export interface ResearchValidationIssue {
  readonly code: ResearchValidationCode;
  readonly severity: ResearchValidationSeverity;
  readonly message: string;
  readonly claimId?: string;
  readonly sourceId?: string;
  readonly datasetId?: string;
}

export interface ResearchValidationReport {
  readonly valid: boolean;
  readonly issues: readonly ResearchValidationIssue[];
  readonly fatalIssues: readonly ResearchValidationIssue[];
}

export function validateResearchPack(pack: ResearchPack): ResearchValidationReport {
  const issues: ResearchValidationIssue[] = [];
  const sources = new Map(pack.sources.map((source) => [source.id, source]));
  const datasets = new Map(pack.datasets.map((dataset) => [dataset.id, dataset]));

  for (const claim of pack.claims) {
    validateClaimEvidence(claim, issues);
    validateAssumptionLabel(claim, issues);
    validateSourceGrades(claim, sources, issues);
    validateReferences(claim, sources, datasets, issues);
    validateMajorNumbers(claim, datasets, issues);
  }

  const fatalIssues = issues.filter((issue) => issue.severity === "fatal");
  return {
    valid: fatalIssues.length === 0,
    issues,
    fatalIssues,
  };
}

function validateClaimEvidence(claim: Claim, issues: ResearchValidationIssue[]) {
  if (isFactualClaim(claim) && claim.sourceIds.length === 0 && claim.datasetIds.length === 0) {
    issues.push({
      code: "missing_evidence",
      severity: "fatal",
      claimId: claim.id,
      message: "Factual claims require at least one source or dataset reference.",
    });
  }
}

function validateAssumptionLabel(claim: Claim, issues: ResearchValidationIssue[]) {
  const uncertainty = getUncertaintyPolicy({
    confidence: claim.confidence,
    status: claim.status,
  });
  if (uncertainty.labelRequired && !claim.needsUserReview) {
    issues.push({
      code: "label_required",
      severity: "warning",
      claimId: claim.id,
      message: "Assumptions, uncertainty, and conflicts must be visibly labeled for review.",
    });
  }
}

function validateSourceGrades(
  claim: Claim,
  sources: ReadonlyMap<string, Source>,
  issues: ResearchValidationIssue[],
) {
  const claimSources = claim.sourceIds
    .map((sourceId) => sources.get(sourceId))
    .filter((source) => source !== undefined);
  if (claimSources.length === 0) return;

  const supportsMajorClaim = claimSources.some((source) => canSupportMajorClaim(source.grade));
  if (isFactualClaim(claim) && !supportsMajorClaim && claim.datasetIds.length === 0) {
    issues.push({
      code: "weak_source_grade",
      severity: "fatal",
      claimId: claim.id,
      message: "Major factual claims require A/B grade sources or datasets.",
    });
  }

  const supportsMajorNumber = claimSources.some((source) => canSupportMajorNumber(source.grade));
  if (claim.hasNumber && !supportsMajorNumber && claim.datasetIds.length === 0) {
    issues.push({
      code: "weak_source_grade",
      severity: "fatal",
      claimId: claim.id,
      message: "Major numbers require A/B grade sources or datasets.",
    });
  }
}

function validateReferences(
  claim: Claim,
  sources: ReadonlyMap<string, Source>,
  datasets: ReadonlyMap<string, ResearchDataset>,
  issues: ResearchValidationIssue[],
) {
  claim.sourceIds.forEach((sourceId) => {
    if (!sources.has(sourceId)) {
      issues.push({
        code: "unknown_reference",
        severity: "fatal",
        claimId: claim.id,
        sourceId,
        message: `Unknown source reference: ${sourceId}`,
      });
    }
  });
  claim.datasetIds.forEach((datasetId) => {
    if (!datasets.has(datasetId)) {
      issues.push({
        code: "unknown_reference",
        severity: "fatal",
        claimId: claim.id,
        datasetId,
        message: `Unknown dataset reference: ${datasetId}`,
      });
    }
  });
}

function validateMajorNumbers(
  claim: Claim,
  datasets: ReadonlyMap<string, ResearchDataset>,
  issues: ResearchValidationIssue[],
) {
  if (!claim.hasNumber) return;
  if (claim.numericEvidence.length === 0) {
    issues.push(numberIssue(claim.id, "Major numeric claims require numeric evidence."));
  }
  for (const evidence of claim.numericEvidence) {
    if (!isCompleteNumberEvidence(evidence)) {
      issues.push(
        numberIssue(claim.id, "Major numbers require unit, base year, geography, and definition."),
      );
    }
    if (!evidence.datasetId || !datasets.has(evidence.datasetId)) {
      issues.push(numberIssue(claim.id, "Major numbers require a valid dataset reference."));
    }
  }
}

function isFactualClaim(claim: Claim): boolean {
  return claim.status !== "assumption" && claim.confidence !== "assumption";
}

function isCompleteNumberEvidence(evidence: NumericEvidence): boolean {
  return (
    !!evidence.unit.trim() &&
    evidence.baseYear >= 1800 &&
    !!evidence.geography.trim() &&
    !!evidence.definition.trim()
  );
}

function numberIssue(claimId: string, message: string): ResearchValidationIssue {
  return {
    code: "major_number_metadata",
    severity: "fatal",
    claimId,
    message,
  };
}
