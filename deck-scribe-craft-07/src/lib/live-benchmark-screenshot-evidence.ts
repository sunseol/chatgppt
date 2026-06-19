import type { LiveBenchmarkEvidenceIssue, LiveBenchmarkRun } from "./live-benchmark-evidence";
import { duplicatePassedArtifactRefs } from "./live-benchmark-output-artifact-duplicates";
import { hasNonSyntheticEvidencePath } from "./live-evidence-path";

export function duplicateScreenshotEvidenceIssues(
  runs: readonly LiveBenchmarkRun[],
): readonly LiveBenchmarkEvidenceIssue[] {
  const duplicates = duplicatePassedArtifactRefs(
    runs,
    (run) => run.outputBundle.screenshotPaths ?? [],
  );
  return duplicates.length === 0
    ? []
    : [
        {
          code: "duplicate_output_bundle_screenshot",
          message: "Passed Live benchmark bundles must not reuse screenshot evidence.",
          refs: duplicates,
        },
      ];
}

export function hasDistinctScreenshotEvidence(
  screenshotPaths: readonly string[],
  minimumCount: number,
): boolean {
  const normalized = screenshotPaths
    .map((path) => path.trim())
    .filter((path) => validScreenshotPath(path));
  return normalized.length >= minimumCount && new Set(normalized).size >= minimumCount;
}

function validScreenshotPath(value: string): boolean {
  return hasNonSyntheticEvidencePath(value, [".png"]);
}
