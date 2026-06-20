import type {
  LiveInterruptionIssue,
  LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

export function partialImageResumeIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const imageScenario = scenarios.find((scenario) => scenario.id === "image_partial_resume");
  if (!imageScenario) return [];

  const completedBefore = new Set(normalizedArtifactIds(imageScenario.completedArtifactIdsBefore));
  const pendingImageIds = normalizedArtifactIds(imageScenario.pendingImageArtifactIds);
  const resumedImageIds = normalizedArtifactIds(imageScenario.resumedArtifactIds);
  const pendingImages = new Set(pendingImageIds);
  const resumedImages = new Set(resumedImageIds);
  const blankRefs =
    hasBlankArtifactId(imageScenario.pendingImageArtifactIds) ||
    hasBlankArtifactId(imageScenario.resumedArtifactIds)
      ? ["blank_image_artifact_id"]
      : [];
  const duplicateRefs = distinct([
    ...duplicateArtifactIds(pendingImageIds),
    ...duplicateArtifactIds(resumedImageIds),
  ]);
  const resumedCompleted = resumedImageIds.filter((artifactId) => completedBefore.has(artifactId));
  const missedPending = pendingImageIds.filter((artifactId) => !resumedImages.has(artifactId));
  const unexpectedResumed = resumedImageIds.filter(
    (artifactId) => !pendingImages.has(artifactId) && !completedBefore.has(artifactId),
  );
  const refs = distinct([
    ...blankRefs,
    ...duplicateRefs,
    ...resumedCompleted,
    ...missedPending,
    ...unexpectedResumed,
  ]);
  return refs.length === 0
    ? []
    : [
        {
          code: "unsafe_partial_image_resume",
          message: "Partial image resume must retry only unfinished image artifacts.",
          refs,
        },
      ];
}

function normalizedArtifactIds(artifactIds: readonly string[]): readonly string[] {
  return artifactIds.map((artifactId) => artifactId.trim()).filter(Boolean);
}

function hasBlankArtifactId(artifactIds: readonly string[]): boolean {
  return artifactIds.some((artifactId) => artifactId.trim().length === 0);
}

function duplicateArtifactIds(artifactIds: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const artifactId of artifactIds) {
    if (seen.has(artifactId)) duplicates.add(artifactId);
    seen.add(artifactId);
  }
  return Array.from(duplicates);
}

function distinct(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}
