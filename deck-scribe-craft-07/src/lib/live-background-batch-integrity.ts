import type { LiveBackgroundBatch, LiveBackgroundBatchIssue } from "./live-background-batch";

export function batchIntegrityIssues(
  batch: LiveBackgroundBatch,
): readonly LiveBackgroundBatchIssue[] {
  return [
    ...batchSizeIssues(batch),
    ...promptPackageCountIssues(batch),
    ...storedArtifactCountIssues(batch),
    ...duplicateProviderRequestIssues(batch),
    ...duplicateStoredArtifactIssues(batch),
  ];
}

function batchSizeIssues(batch: LiveBackgroundBatch): readonly LiveBackgroundBatchIssue[] {
  return batch.artifacts.length === 5
    ? []
    : [
        {
          code: "expected_five_artifacts",
          message: "Live background generation requires exactly five artifacts.",
        },
      ];
}

function promptPackageCountIssues(batch: LiveBackgroundBatch): readonly LiveBackgroundBatchIssue[] {
  return batch.promptPackages.length === 5
    ? []
    : [
        {
          code: "prompt_package_count_mismatch",
          message: "Live background generation requires exactly five prompt packages.",
        },
      ];
}

function storedArtifactCountIssues(
  batch: LiveBackgroundBatch,
): readonly LiveBackgroundBatchIssue[] {
  if (batch.storedArtifacts === undefined) return [];
  return batch.storedArtifacts.length === 5
    ? []
    : [
        {
          code: "stored_artifact_count_mismatch",
          message: "Live background generation requires exactly five stored image artifacts.",
        },
      ];
}

function duplicateProviderRequestIssues(
  batch: LiveBackgroundBatch,
): readonly LiveBackgroundBatchIssue[] {
  const seen = new Set<string>();
  return batch.artifacts.flatMap((artifact) => {
    const requestId = artifact.request?.requestId;
    if (!requestId) return [];
    if (!seen.has(requestId)) {
      seen.add(requestId);
      return [];
    }
    return [
      {
        code: "duplicate_provider_request_metadata" as const,
        slideNumber: artifact.slideNumber,
        message: "Live background provider request ids must be unique per slide.",
      },
    ];
  });
}

function duplicateStoredArtifactIssues(
  batch: LiveBackgroundBatch,
): readonly LiveBackgroundBatchIssue[] {
  const seen = new Set<string>();
  return (batch.storedArtifacts ?? []).flatMap((stored) => {
    const identities = [stored.binary.artifactId, stored.binary.path, stored.binary.hash];
    const duplicate = identities.some((identity) => seen.has(identity));
    for (const identity of identities) seen.add(identity);
    return duplicate
      ? [
          {
            code: "duplicate_stored_background_artifact" as const,
            slideNumber: stored.metadata.slideNumber,
            message: "Stored live background artifact ids, paths, and hashes must be unique.",
          },
        ]
      : [];
  });
}
