import type {
  LiveInterruptionIssue,
  LiveInterruptionScenarioEvidence,
} from "./live-interruption-matrix";

export function partialImageResumeIssues(
  scenarios: readonly LiveInterruptionScenarioEvidence[],
): readonly LiveInterruptionIssue[] {
  const imageScenario = scenarios.find((scenario) => scenario.id === "image_partial_resume");
  if (!imageScenario) return [];

  const completedBefore = new Set(imageScenario.completedArtifactIdsBefore);
  const pendingImages = new Set(imageScenario.pendingImageArtifactIds);
  const resumedCompleted = imageScenario.resumedArtifactIds.filter((artifactId) =>
    completedBefore.has(artifactId),
  );
  const missedPending = imageScenario.pendingImageArtifactIds.filter(
    (artifactId) => !imageScenario.resumedArtifactIds.includes(artifactId),
  );
  const unexpectedResumed = imageScenario.resumedArtifactIds.filter(
    (artifactId) => !pendingImages.has(artifactId) && !completedBefore.has(artifactId),
  );
  const refs = distinct([...resumedCompleted, ...missedPending, ...unexpectedResumed]);
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

function distinct(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}
