import type {
  LiveBenchmarkEvidenceIssue,
  LiveBenchmarkEvidenceIssueCode,
  LiveBenchmarkOutputBundleManifest,
  LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import { duplicatePassedArtifactRefs } from "./live-benchmark-output-artifact-duplicates";
import {
  duplicateOutputBundleRefs,
  duplicateOutputBundleReports,
  duplicatePassedExportArtifacts,
} from "./live-benchmark-output-bundle-duplicates";
import { hasNonSyntheticEvidencePath } from "./live-evidence-path";

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
  const duplicateReports = duplicateOutputBundleReports(runs);
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
  const duplicateSourceArtifacts = duplicatePassedArtifactRefs(
    runs,
    (run) => run.outputBundle.sourceArtifactIds,
  );
  const duplicateImageArtifacts = duplicatePassedArtifactRefs(
    runs,
    (run) => run.outputBundle.liveImageArtifactIds,
  );
  const duplicateImageRequests = duplicatePassedArtifactRefs(
    runs,
    (run) => run.outputBundle.liveImageRequestIds,
  );
  const duplicateGoldenPathReports = duplicatePassedArtifactRefs(runs, (run) =>
    validEvidenceReportPath(run.outputBundle.goldenPathReportPath, "live_e2e_report.md")
      ? [run.outputBundle.goldenPathReportPath]
      : [],
  );
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
    ...(duplicateReports.length === 0
      ? []
      : [
          issue(
            "duplicate_output_bundle_report",
            "Each Live benchmark output bundle must reference a distinct scenario report.",
            duplicateReports,
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
    ...(duplicateSourceArtifacts.length === 0
      ? []
      : [
          issue(
            "duplicate_output_bundle_source_artifact",
            "Passed Live benchmark bundles must not reuse source artifact evidence.",
            duplicateSourceArtifacts,
          ),
        ]),
    ...(duplicateImageArtifacts.length === 0
      ? []
      : [
          issue(
            "duplicate_output_bundle_image_artifact",
            "Passed Live benchmark bundles must not reuse live image artifacts.",
            duplicateImageArtifacts,
          ),
        ]),
    ...(duplicateImageRequests.length === 0
      ? []
      : [
          issue(
            "duplicate_output_bundle_image_request",
            "Passed Live benchmark bundles must not reuse live image requests.",
            duplicateImageRequests,
          ),
        ]),
    ...(duplicateGoldenPathReports.length === 0
      ? []
      : [
          issue(
            "duplicate_output_bundle_golden_path_report",
            "Passed Live benchmark bundles must not reuse Golden Path report evidence.",
            duplicateGoldenPathReports,
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
  return hasNonSyntheticEvidencePath(value, [".zip", ".json"]);
}

function validEvidenceReportPath(value: string, expectedSuffix: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (!normalized.endsWith(expectedSuffix)) return false;
  return hasNonSyntheticEvidencePath(value, [".md"]);
}

function issue(
  code: LiveBenchmarkEvidenceIssueCode,
  message: string,
  refs: readonly string[],
): LiveBenchmarkEvidenceIssue {
  return { code, message, refs };
}
