import type {
  LiveBenchmarkEvidenceIssue,
  LiveBenchmarkEvidenceIssueCode,
  LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import { hasObservedBenchmarkEvidencePath } from "./live-benchmark-evidence-path";
import { goldenPathEvidenceIssues } from "./live-benchmark-golden-path-evidence";
import { liveBenchmarkImageProviderIdentityIds } from "./live-benchmark-image-provider-identity";
import { duplicatePassedArtifactRefs } from "./live-benchmark-output-artifact-duplicates";
import { evidenceCountMismatchRefs } from "./live-benchmark-output-bundle-counts";
import {
  duplicateOutputBundleRefs,
  duplicateOutputBundleReports,
  duplicatePassedExportArtifacts,
} from "./live-benchmark-output-bundle-duplicates";
import {
  duplicateScreenshotEvidenceIssues,
  missingStepScreenshotEvidenceIssues,
} from "./live-benchmark-screenshot-evidence";
import { scenarioPathEvidenceIssues } from "./live-benchmark-scenario-path-evidence";

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
  const countMismatches = evidenceCountMismatchRefs(runs);
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
  const duplicateImageRequests = duplicatePassedArtifactRefs(runs, (run) =>
    liveBenchmarkImageProviderIdentityIds(run.outputBundle),
  );
  const duplicateGoldenPathReports = duplicatePassedArtifactRefs(runs, (run) =>
    validEvidenceReportPath(run.outputBundle.goldenPathReportPath, "live_e2e_report.md")
      ? [run.outputBundle.goldenPathReportPath]
      : [],
  );
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
    ...(countMismatches.length === 0
      ? []
      : [
          issue(
            "output_bundle_evidence_count_mismatch",
            "Passed output bundle evidence counts must match their manifest reference lists.",
            countMismatches,
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
    ...scenarioPathEvidenceIssues(runs),
    ...duplicateScreenshotEvidenceIssues(runs),
    ...missingStepScreenshotEvidenceIssues(runs),
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
            "Passed Live benchmark bundles must not reuse live image provider turn/request ids.",
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
    ...goldenPathEvidenceIssues(runs),
  ];
}

function validOutputBundlePath(value: string): boolean {
  return hasObservedBenchmarkEvidencePath(value, [".zip", ".json"]);
}

function validEvidenceReportPath(value: string, expectedSuffix: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (!normalized.endsWith(expectedSuffix)) return false;
  return hasObservedBenchmarkEvidencePath(value, [".md"]);
}

function issue(
  code: LiveBenchmarkEvidenceIssueCode,
  message: string,
  refs: readonly string[],
): LiveBenchmarkEvidenceIssue {
  return { code, message, refs };
}
