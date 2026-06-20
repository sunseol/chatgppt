import type {
  LiveBenchmarkEvidenceIssue,
  LiveBenchmarkOutputBundleManifest,
  LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import { hasDistinctScreenshotEvidence } from "./live-benchmark-screenshot-evidence";
import { hasNonSyntheticEvidencePath } from "./live-evidence-path";

export function goldenPathEvidenceIssues(
  runs: readonly LiveBenchmarkRun[],
): readonly LiveBenchmarkEvidenceIssue[] {
  const missingGoldenPathEvidence = passedRuns(runs)
    .filter((run) => !hasCoreGoldenPathEvidence(run.outputBundle))
    .map((run) => run.id);
  const missingRegenerationImages = passedRuns(runs)
    .filter(
      (run) =>
        hasCoreGoldenPathEvidence(run.outputBundle) &&
        !hasRegeneratedImageEvidence(run.outputBundle),
    )
    .map((run) => run.id);

  return [
    ...(missingGoldenPathEvidence.length === 0
      ? []
      : [
          {
            code: "output_bundle_golden_path_evidence_missing" as const,
            message:
              "Passed Live benchmark bundles must include Golden Path report, screenshots, sources, initial images, and image requests.",
            refs: missingGoldenPathEvidence,
          },
        ]),
    ...(missingRegenerationImages.length === 0
      ? []
      : [
          {
            code: "output_bundle_regeneration_image_missing" as const,
            message:
              "Passed Live benchmark bundles must include approved full-slide regeneration image evidence.",
            refs: missingRegenerationImages,
          },
        ]),
  ];
}

function passedRuns(runs: readonly LiveBenchmarkRun[]): readonly LiveBenchmarkRun[] {
  return runs.filter((run) => run.status === "passed");
}

function hasCoreGoldenPathEvidence(bundle: LiveBenchmarkOutputBundleManifest): boolean {
  const regeneratedImageIds = normalizedIds(bundle.regeneratedLiveImageArtifactIds ?? []);
  const initialImageIds = [...normalizedIds(bundle.liveImageArtifactIds)].filter(
    (artifactId) => !regeneratedImageIds.has(artifactId),
  );
  return (
    validEvidenceReportPath(bundle.goldenPathReportPath, "live_e2e_report.md") &&
    bundle.screenshotCount >= 10 &&
    hasDistinctScreenshotEvidence(bundle.screenshotPaths ?? [], 10) &&
    bundle.sourceCount >= 3 &&
    bundle.imageArtifactCount >= 5 &&
    hasDistinctArtifactEvidence(bundle.sourceArtifactIds, 3) &&
    hasDistinctArtifactEvidence(initialImageIds, 5) &&
    hasDistinctArtifactEvidence(bundle.liveImageRequestIds, 5)
  );
}

function hasRegeneratedImageEvidence(bundle: LiveBenchmarkOutputBundleManifest): boolean {
  const liveImageIds = normalizedIds(bundle.liveImageArtifactIds);
  return [...normalizedIds(bundle.regeneratedLiveImageArtifactIds ?? [])].some((artifactId) =>
    liveImageIds.has(artifactId),
  );
}

function normalizedIds(artifactIds: readonly string[]): ReadonlySet<string> {
  return new Set(artifactIds.map((artifactId) => artifactId.trim()).filter(Boolean));
}

function hasDistinctArtifactEvidence(artifactIds: Iterable<string>, minimumCount: number): boolean {
  const normalized = [...artifactIds].map((artifactId) => artifactId.trim()).filter(Boolean);
  return normalized.length >= minimumCount && new Set(normalized).size >= minimumCount;
}

function validEvidenceReportPath(value: string, expectedSuffix: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (!normalized.endsWith(expectedSuffix)) return false;
  return hasNonSyntheticEvidencePath(value, [".md"]);
}
