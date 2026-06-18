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
  const missing = runs.filter((run) => !run.outputBundlePath.trim()).map((run) => run.id);
  const missingManifests = runs.filter((run) => !run.outputBundle.path.trim()).map((run) => run.id);
  const duplicates = duplicateOutputBundleRefs(runs);
  const mismatched = runs
    .filter(
      (run) =>
        (run.outputBundlePath.trim() &&
          run.outputBundle.path.trim() &&
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
    .filter((run) => !run.outputBundle.reportPath.trim())
    .map((run) => run.id);
  const missingExports = runs
    .filter((run) => run.status === "passed" && !run.outputBundle.exportArtifactId.trim())
    .map((run) => run.id);
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
    ...(missingGoldenPathEvidence.length === 0
      ? []
      : [
          issue(
            "output_bundle_golden_path_evidence_missing",
            "Passed Live benchmark bundles must include Golden Path report, screenshots, sources, and images.",
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
    if (!path) continue;
    const firstRunId = seen.get(path);
    if (firstRunId === undefined) {
      seen.set(path, run.id);
      continue;
    }
    duplicates.push(`${firstRunId}:${run.id}:${path}`);
  }
  return duplicates;
}

function hasGoldenPathEvidence(bundle: LiveBenchmarkOutputBundleManifest): boolean {
  return (
    bundle.goldenPathReportPath.endsWith("live_e2e_report.md") &&
    bundle.screenshotCount >= 10 &&
    bundle.sourceCount >= 3 &&
    bundle.imageArtifactCount >= 5
  );
}

function issue(
  code: LiveBenchmarkEvidenceIssueCode,
  message: string,
  refs: readonly string[],
): LiveBenchmarkEvidenceIssue {
  return { code, message, refs };
}
