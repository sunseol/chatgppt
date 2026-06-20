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
