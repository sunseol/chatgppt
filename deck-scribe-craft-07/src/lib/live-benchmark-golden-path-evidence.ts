import type {
  LiveBenchmarkEvidenceIssue,
  LiveBenchmarkOutputBundleManifest,
  LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import {
  hasInvalidBenchmarkArtifactMarker,
  hasObservedBenchmarkEvidencePath,
} from "./live-benchmark-evidence-path";
import {
  liveBenchmarkCitedImageProviderIdentityIds,
  liveBenchmarkImageProviderIdentityIds,
} from "./live-benchmark-image-provider-identity";
import { hasDistinctScreenshotEvidence } from "./live-benchmark-screenshot-evidence";

export function goldenPathEvidenceIssues(
  runs: readonly LiveBenchmarkRun[],
): readonly LiveBenchmarkEvidenceIssue[] {
  const syntheticArtifactRefs = passedRuns(runs).flatMap((run) => syntheticRefs(run));
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
    ...(syntheticArtifactRefs.length === 0
      ? []
      : [
          {
            code: "output_bundle_synthetic_artifact_reference" as const,
            message:
              "Passed Live benchmark bundles must not cite synthetic or observer-template artifact/request ids.",
            refs: syntheticArtifactRefs,
          },
        ]),
    ...(missingGoldenPathEvidence.length === 0
      ? []
      : [
          {
            code: "output_bundle_golden_path_evidence_missing" as const,
            message:
              "Passed Live benchmark bundles must include Golden Path report, screenshots, sources, initial images, and image provider turn/request ids.",
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
    hasDistinctArtifactEvidence(liveBenchmarkImageProviderIdentityIds(bundle), 5)
  );
}

function hasRegeneratedImageEvidence(bundle: LiveBenchmarkOutputBundleManifest): boolean {
  const liveImageIds = normalizedIds(bundle.liveImageArtifactIds);
  return [...normalizedIds(bundle.regeneratedLiveImageArtifactIds ?? [])].some((artifactId) =>
    liveImageIds.has(artifactId),
  );
}

function normalizedIds(artifactIds: readonly string[]): ReadonlySet<string> {
  return new Set(canonicalArtifactIds(artifactIds));
}

function hasDistinctArtifactEvidence(artifactIds: Iterable<string>, minimumCount: number): boolean {
  const canonical = canonicalArtifactIds([...artifactIds]);
  return canonical.length >= minimumCount && new Set(canonical).size >= minimumCount;
}

function canonicalArtifactIds(artifactIds: readonly string[]): readonly string[] {
  return artifactIds.filter(
    (artifactId) => artifactId.length > 0 && artifactId === artifactId.trim(),
  );
}

function validEvidenceReportPath(value: string, expectedSuffix: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (!normalized.endsWith(expectedSuffix)) return false;
  return hasObservedBenchmarkEvidencePath(value, [".md"]);
}

function syntheticRefs(run: LiveBenchmarkRun): readonly string[] {
  return [
    run.outputBundle.exportArtifactId,
    ...run.outputBundle.sourceArtifactIds,
    ...run.outputBundle.liveImageArtifactIds,
    ...(run.outputBundle.regeneratedLiveImageArtifactIds ?? []),
    ...liveBenchmarkCitedImageProviderIdentityIds(run.outputBundle),
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && hasSyntheticMarker(value))
    .map((value) => `${run.id}:${value}`);
}

function hasSyntheticMarker(value: string): boolean {
  return hasInvalidBenchmarkArtifactMarker(value);
}
