import type {
  LiveBenchmarkEvidenceIssue,
  LiveBenchmarkEvidenceIssueCode,
  LiveBenchmarkId,
  LiveBenchmarkOutputBundleManifest,
  LiveBenchmarkRun,
} from "./live-benchmark-evidence";

export function outputBundleIssues(
  runs: readonly LiveBenchmarkRun[],
  packageArchiveSha256: string,
): readonly LiveBenchmarkEvidenceIssue[] {
  const missing = runs
    .filter((run) => !validOutputBundlePath(run.outputBundlePath))
    .map((run) => run.id);
  const missingManifests = runs
    .filter(
      (run) =>
        validOutputBundlePath(run.outputBundlePath) &&
        !validOutputBundlePath(run.outputBundle.path),
    )
    .map((run) => run.id);
  const duplicates = duplicateOutputBundleRefs(runs);
  const mismatched = runs
    .filter(
      (run) =>
        (validOutputBundlePath(run.outputBundlePath) &&
          validOutputBundlePath(run.outputBundle.path) &&
          run.outputBundle.path !== run.outputBundlePath) ||
        run.outputBundle.benchmarkId !== run.id,
    )
    .map((run) => run.id);
  const packageMismatched = runs
    .filter(
      (run) =>
        run.outputBundle.path.trim() &&
        run.outputBundle.packageArchiveSha256 !== packageArchiveSha256,
    )
    .map((run) => run.id);
  const missingReports = runs
    .filter((run) => !validEvidenceReportPath(run.outputBundle.reportPath, ".md"))
    .map((run) => run.id);
  const missingExports = runs
    .filter((run) => run.status === "passed" && !run.outputBundle.exportArtifactId.trim())
    .map((run) => run.id);
  const duplicateExportArtifacts = duplicatePassedExportArtifacts(runs);
  const missingGoldenPathEvidence = runs
    .filter((run) => run.status === "passed" && !hasGoldenPathEvidence(run.outputBundle))
    .map((run) => run.id);

  return [
    ...(missing.length === 0
      ? []
      : [
          issue("missing_output_bundle", "Each Live benchmark requires an output bundle.", missing),
        ]),
    ...(missingManifests.length === 0
      ? []
      : [
          issue(
            "missing_output_bundle_manifest",
            "Each Live benchmark output bundle requires a manifest.",
            missingManifests,
          ),
        ]),
    ...(duplicates.length === 0
      ? []
      : [
          issue(
            "duplicate_output_bundle",
            "Each Live benchmark requires a distinct output bundle.",
            duplicates,
          ),
        ]),
    ...(mismatched.length === 0
      ? []
      : [
          issue(
            "output_bundle_benchmark_mismatch",
            "Output bundle manifests must match the benchmark id and bundle path.",
            mismatched,
          ),
        ]),
    ...(packageMismatched.length === 0
      ? []
      : [
          issue(
            "output_bundle_package_mismatch",
            "Output bundle manifests must match the package archive SHA-256 under benchmark.",
            packageMismatched,
          ),
        ]),
    ...(missingReports.length === 0
      ? []
      : [
          issue(
            "output_bundle_report_missing",
            "Output bundle manifests must include the scenario report path.",
            missingReports,
          ),
        ]),
    ...(missingExports.length === 0
      ? []
      : [
          issue(
            "output_bundle_export_missing",
            "Passed Live benchmark bundles must include the final export artifact id.",
            missingExports,
          ),
        ]),
    ...(duplicateExportArtifacts.length === 0
      ? []
      : [
          issue(
            "duplicate_output_bundle_artifact",
            "Passed Live benchmark bundles must reference distinct final export artifacts.",
            duplicateExportArtifacts,
          ),
        ]),
    ...(missingGoldenPathEvidence.length === 0
      ? []
      : [
          issue(
            "output_bundle_golden_path_evidence_missing",
            "Passed Live benchmark bundles must include Golden Path report, screenshots, sources, images, and image requests.",
            missingGoldenPathEvidence,
          ),
        ]),
  ];
}

function duplicateOutputBundleRefs(runs: readonly LiveBenchmarkRun[]): readonly string[] {
  const seen = new Map<string, LiveBenchmarkId>();
  const duplicates: string[] = [];
  for (const run of runs) {
    const path = run.outputBundlePath.trim();
    if (!validOutputBundlePath(path)) continue;
    const firstRunId = seen.get(path);
    if (firstRunId === undefined) {
      seen.set(path, run.id);
      continue;
    }
    duplicates.push(`${firstRunId}:${run.id}:${path}`);
  }
  return duplicates;
}

function duplicatePassedExportArtifacts(runs: readonly LiveBenchmarkRun[]): readonly string[] {
  const seen = new Map<string, LiveBenchmarkId>();
  const duplicates: string[] = [];
  for (const run of runs) {
    if (run.status !== "passed") continue;
    const exportArtifactId = run.outputBundle.exportArtifactId.trim();
    if (!exportArtifactId) continue;
    const firstRunId = seen.get(exportArtifactId);
    if (firstRunId === undefined) {
      seen.set(exportArtifactId, run.id);
      continue;
    }
    duplicates.push(`${firstRunId}:${run.id}:${exportArtifactId}`);
  }
  return duplicates;
}

function hasGoldenPathEvidence(bundle: LiveBenchmarkOutputBundleManifest): boolean {
  return (
    validEvidenceReportPath(bundle.goldenPathReportPath, "live_e2e_report.md") &&
    bundle.screenshotCount >= 10 &&
    bundle.sourceCount >= 3 &&
    bundle.imageArtifactCount >= 5 &&
    hasDistinctArtifactEvidence(bundle.sourceArtifactIds, 3) &&
    hasDistinctArtifactEvidence(bundle.liveImageArtifactIds, 5) &&
    hasDistinctArtifactEvidence(bundle.liveImageRequestIds, 5)
  );
}

function hasDistinctArtifactEvidence(
  artifactIds: readonly string[],
  minimumCount: number,
): boolean {
  const normalized = artifactIds.map((artifactId) => artifactId.trim()).filter(Boolean);
  return normalized.length >= minimumCount && new Set(normalized).size >= minimumCount;
}

function validOutputBundlePath(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (!normalized.endsWith(".zip") && !normalized.endsWith(".json")) return false;
  return isNonSyntheticPath(normalized);
}

function validEvidenceReportPath(value: string, expectedSuffix: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (!normalized.endsWith(expectedSuffix)) return false;
  return isNonSyntheticPath(normalized);
}

function isNonSyntheticPath(normalized: string): boolean {
  const segments = normalized.split(/[/\\._-]+/).filter(Boolean);
  return !["mock", "fixture", "fixtures", "test", "tests", "fake", "fakes"].some((marker) =>
    segments.includes(marker),
  );
}

function issue(
  code: LiveBenchmarkEvidenceIssueCode,
  message: string,
  refs: readonly string[],
): LiveBenchmarkEvidenceIssue {
  return { code, message, refs };
}
