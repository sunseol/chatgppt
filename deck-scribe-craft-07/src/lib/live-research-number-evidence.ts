import type {
  LiveResearchEvidenceIssue,
  LiveResearchEvidenceReference,
} from "./live-research-evidence";
import type { Claim, NumericEvidence, ResearchDataset } from "./research-types";

export function validateClaimNumberEvidence(
  claim: Claim,
  evidenceRefs: readonly LiveResearchEvidenceReference[],
  datasetsById: ReadonlyMap<string, ResearchDataset>,
  issues: LiveResearchEvidenceIssue[],
) {
  if (!claim.hasNumber) return;

  const datasets = referencedDatasets(claim, datasetsById);

  for (const dataset of datasets) {
    if (!datasetHasClaimSource(dataset, claim.sourceIds)) {
      issues.push(
        issue({
          code: "unknown_reference",
          claimId: claim.id,
          datasetId: dataset.id,
          message: `Dataset is not linked to a claim source artifact: ${dataset.id}`,
        }),
      );
    }
  }

  if (!hasDatasetReference(datasets, claim.sourceIds)) {
    issues.push(
      issue({
        code: "missing_number_dataset",
        claimId: claim.id,
        message:
          "Major numbers require a dataset or numeric evidence reference from source artifacts.",
      }),
    );
  }

  for (const numericEvidence of claim.numericEvidence) {
    if (!isCompleteNumberEvidence(numericEvidence)) {
      issues.push(numberMetadataIssue(claim.id));
    }
  }

  for (const dataset of datasets) {
    if (!isCompleteDatasetMetadata(dataset)) {
      issues.push(numberMetadataIssue(claim.id, dataset.id));
    }
  }
}

function hasDatasetReference(
  datasets: readonly ResearchDataset[],
  claimSourceIds: readonly string[],
): boolean {
  return datasets.some((dataset) => datasetHasClaimSource(dataset, claimSourceIds));
}

function referencedDatasets(
  claim: Claim,
  datasetsById: ReadonlyMap<string, ResearchDataset>,
): readonly ResearchDataset[] {
  return claim.datasetIds.flatMap((datasetId) => {
    const dataset = datasetsById.get(datasetId);
    return dataset === undefined ? [] : [dataset];
  });
}

function isCompleteNumberEvidence(evidence: NumericEvidence): boolean {
  return (
    !!evidence.unit.trim() &&
    evidence.baseYear >= 1800 &&
    !!evidence.geography.trim() &&
    !!evidence.definition.trim()
  );
}

function datasetHasClaimSource(
  dataset: ResearchDataset,
  claimSourceIds: readonly string[],
): boolean {
  return dataset.sourceIds.some((sourceId) => claimSourceIds.includes(sourceId));
}

function isCompleteDatasetMetadata(dataset: ResearchDataset): boolean {
  return (
    !!dataset.unit.trim() &&
    !!dataset.period.trim() &&
    !!dataset.geography.trim() &&
    !!dataset.definition.trim()
  );
}

function numberMetadataIssue(claimId: string, datasetId?: string): LiveResearchEvidenceIssue {
  return issue({
    code: "major_number_metadata",
    claimId,
    datasetId,
    message: "Major numbers require unit, period, geography, and definition.",
  });
}

function issue(input: {
  readonly code: LiveResearchEvidenceIssue["code"];
  readonly message: string;
  readonly claimId?: string;
  readonly datasetId?: string;
}): LiveResearchEvidenceIssue {
  return { ...input, severity: "fatal" };
}
