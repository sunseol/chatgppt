import { liveGoldenPathIssue, type LiveGoldenPathE2EIssue } from "./live-golden-path-e2e-contract";
import { liveImageArtifacts } from "./live-golden-path-e2e-evidence";
import type { ProviderArtifactProvenance } from "./provider-provenance";

export function imageArtifactIssues(
  imageArtifacts: readonly ProviderArtifactProvenance[],
): readonly LiveGoldenPathE2EIssue[] {
  const liveImages = liveImageArtifacts(imageArtifacts);
  const artifactIds = liveImages.map((artifact) => artifact.artifactId);
  const regeneratedArtifactIds = regeneratedLiveImageArtifactIds(liveImages);
  const initialArtifactIds = artifactIds.filter(
    (artifactId) => !regeneratedArtifactIds.has(artifactId),
  );
  const distinctInitialArtifactIds = new Set(initialArtifactIds);
  const duplicateArtifactIds = duplicateValues(artifactIds);
  const duplicateRequestIds = duplicateValues(liveImages.map(imageProviderRunId));
  return [
    ...(duplicateArtifactIds.length === 0
      ? []
      : [
          liveGoldenPathIssue(
            "duplicate_live_image_artifact",
            "Live Golden Path image artifacts must be distinct.",
            duplicateArtifactIds,
          ),
        ]),
    ...(duplicateRequestIds.length === 0
      ? []
      : [
          liveGoldenPathIssue(
            "duplicate_live_image_request",
            "Live Golden Path image artifacts must come from distinct provider requests.",
            duplicateRequestIds,
          ),
        ]),
    ...(distinctInitialArtifactIds.size >= 5
      ? []
      : [
          liveGoldenPathIssue(
            "insufficient_live_image_artifacts",
            "At least five distinct initial live image artifacts are required before regeneration.",
            [String(distinctInitialArtifactIds.size)],
          ),
        ]),
    ...(distinctInitialArtifactIds.size < 5 || regeneratedArtifactIds.size > 0
      ? []
      : [
          liveGoldenPathIssue(
            "missing_regenerated_live_image_artifact",
            "Golden Path must include one approved live full-slide regeneration image artifact.",
            artifactIds.length === 0 ? ["missing"] : artifactIds,
          ),
        ]),
  ];
}

function regeneratedLiveImageArtifactIds(
  liveImages: readonly ProviderArtifactProvenance[],
): ReadonlySet<string> {
  const liveImageIds = new Set(liveImages.map((artifact) => artifact.artifactId));
  const regeneratedIds = liveImages
    .filter((artifact) => isRegeneratedFromAnotherLiveImage(artifact, liveImageIds))
    .map((artifact) => artifact.artifactId);
  return new Set(regeneratedIds);
}

function isRegeneratedFromAnotherLiveImage(
  artifact: ProviderArtifactProvenance,
  liveImageIds: ReadonlySet<string>,
): boolean {
  return (
    hasRegenerationEvidenceMarker(artifact) && referencesAnotherLiveImage(artifact, liveImageIds)
  );
}

function hasRegenerationEvidenceMarker(artifact: ProviderArtifactProvenance): boolean {
  return (
    hasRegenerationMarker(artifact.artifactId) || hasRegenerationMarker(artifact.promptVersion)
  );
}

function referencesAnotherLiveImage(
  artifact: ProviderArtifactProvenance,
  liveImageIds: ReadonlySet<string>,
): boolean {
  return artifact.inputArtifactIds.some((inputId) => {
    const inputIdIsCanonical = inputId.length > 0 && inputId === inputId.trim();
    return inputIdIsCanonical && inputId !== artifact.artifactId && liveImageIds.has(inputId);
  });
}

function hasRegenerationMarker(value: string): boolean {
  return /regenerat(?:e|ed|ion)/.test(value.toLowerCase());
}

function imageProviderRunId(artifact: ProviderArtifactProvenance): string {
  return canonicalProviderIdentity(
    artifact.providerKind === "codex" ? artifact.turnId : artifact.requestId,
  );
}

function canonicalProviderIdentity(value: string | undefined): string {
  return value !== undefined && value.length > 0 && value === value.trim() ? value : "";
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  return [...duplicates];
}
