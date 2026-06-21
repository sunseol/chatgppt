import type { ProviderArtifactProvenance } from "./provider-provenance";

const NON_LIVE_FINAL_EXPORT_ARTIFACT_MARKERS = [
  "mock",
  "fixture",
  "test",
  "fake",
  "template",
  "sample",
  "example",
  "placeholder",
] as const;

export function hasLiveFinalExportArtifactId(artifactId: string): boolean {
  const normalized = artifactId.toLowerCase();
  return !NON_LIVE_FINAL_EXPORT_ARTIFACT_MARKERS.some((marker) => normalized.includes(marker));
}

export function hasLiveFinalExportLineageArtifact(artifact: ProviderArtifactProvenance): boolean {
  return (
    artifact.executionMode === "production" &&
    artifact.providerKind === "codex" &&
    artifact.authMode === "codex_session" &&
    hasCanonicalText(artifact.threadId) &&
    hasCanonicalText(artifact.turnId)
  );
}

export function formatFinalExportLineageRef(artifact: ProviderArtifactProvenance): string {
  return `${artifact.artifactId}:${artifact.executionMode}/${artifact.providerKind}/${artifact.authMode}`;
}

function hasCanonicalText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}
