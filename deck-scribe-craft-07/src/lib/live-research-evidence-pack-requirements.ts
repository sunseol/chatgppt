import type { LiveResearchEvidenceIssue } from "./live-research-evidence";
import type { ResearchPack } from "./research-types";

export function validatePackDatasetOrNumericEvidence(
  pack: ResearchPack,
): readonly LiveResearchEvidenceIssue[] {
  if (pack.datasets.length > 0 || pack.claims.some((claim) => claim.numericEvidence.length > 0)) {
    return [];
  }
  return [
    {
      code: "missing_dataset_or_numeric_evidence",
      severity: "fatal",
      message: "Live Research Pack requires at least one real dataset or numeric evidence item.",
    },
  ];
}
