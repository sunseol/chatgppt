import type { LiveBenchmarkEvidenceIssue, LiveBenchmarkRun } from "./live-benchmark-evidence";
import { hasObservedBenchmarkEvidencePath } from "./live-benchmark-evidence-path";
import { duplicatePassedArtifactRefs } from "./live-benchmark-output-artifact-duplicates";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "./live-golden-path-e2e-contract";

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

export function missingStepScreenshotEvidenceIssues(
  runs: readonly LiveBenchmarkRun[],
): readonly LiveBenchmarkEvidenceIssue[] {
  const missing = runs
    .filter((run) => run.status === "passed")
    .flatMap((run) => missingStepScreenshotRefs(run));
  return missing.length === 0
    ? []
    : [
        {
          code: "output_bundle_step_screenshot_missing",
          message: "Passed Live benchmark bundles must name every Golden Path step screenshot.",
          refs: missing,
        },
      ];
}

function validScreenshotPath(value: string): boolean {
  return hasObservedBenchmarkEvidencePath(value, [".png"]);
}

function missingStepScreenshotRefs(run: LiveBenchmarkRun): readonly string[] {
  const screenshotPaths = run.outputBundle.screenshotPaths ?? [];
  if (!hasDistinctScreenshotEvidence(screenshotPaths, LIVE_GOLDEN_PATH_E2E_STEPS.length)) {
    return [];
  }
  const screenshotStems = new Set(
    screenshotPaths.filter(validScreenshotPath).map((path) => stem(basename(path))),
  );
  return LIVE_GOLDEN_PATH_E2E_STEPS.filter((step) => !screenshotStems.has(step)).map(
    (step) => `${run.id}:${step}`,
  );
}

function basename(path: string): string {
  return path.split("/").at(-1) ?? "";
}

function stem(filename: string): string {
  const extensionIndex = filename.lastIndexOf(".");
  return extensionIndex === -1 ? filename : filename.slice(0, extensionIndex);
}
