import type { LiveBenchmarkEvidenceIssue, LiveBenchmarkRun } from "./live-benchmark-evidence";
import { hasObservedBenchmarkEvidencePath } from "./live-benchmark-evidence-path";

const BENCHMARK_PATH_SCENARIO_IDS = [
  "korean_business",
  "market_research",
  "chart_report",
  "image_intro",
  "revision_regeneration",
] as const;

export function scenarioPathEvidenceIssues(
  runs: readonly LiveBenchmarkRun[],
): readonly LiveBenchmarkEvidenceIssue[] {
  const mismatches = runs
    .filter((run) => run.status === "passed")
    .flatMap((run) => scenarioPathMismatchRefs(run));
  return mismatches.length === 0
    ? []
    : [
        {
          code: "output_bundle_scenario_evidence_mismatch",
          message:
            "Passed Live benchmark bundles must not borrow another scenario's evidence paths.",
          refs: mismatches,
        },
      ];
}

function scenarioPathMismatchRefs(run: LiveBenchmarkRun): readonly string[] {
  return [
    ...scenarioReportMismatchRefs(run),
    ...goldenPathReportMismatchRefs(run),
    ...screenshotPathMismatchRefs(run),
  ];
}

function scenarioReportMismatchRefs(run: LiveBenchmarkRun): readonly string[] {
  const path = run.outputBundle.reportPath;
  return validEvidenceReportPath(path) && referencesOtherBenchmarkId(run.id, path)
    ? [`${run.id}:${path}`]
    : [];
}

function goldenPathReportMismatchRefs(run: LiveBenchmarkRun): readonly string[] {
  const path = run.outputBundle.goldenPathReportPath;
  return validGoldenPathReportPath(path) && referencesOtherBenchmarkId(run.id, path)
    ? [`${run.id}:${path}`]
    : [];
}

function screenshotPathMismatchRefs(run: LiveBenchmarkRun): readonly string[] {
  return (run.outputBundle.screenshotPaths ?? [])
    .filter((path) => validScreenshotPath(path) && referencesOtherBenchmarkId(run.id, path))
    .map((path) => `${run.id}:${path}`);
}

function referencesOtherBenchmarkId(runId: string, value: string): boolean {
  const normalized = value.toLowerCase();
  return BENCHMARK_PATH_SCENARIO_IDS.some(
    (scenarioId) => scenarioId !== runId && normalized.includes(scenarioId),
  );
}

function validEvidenceReportPath(value: string): boolean {
  return hasObservedBenchmarkEvidencePath(value, [".md"]);
}

function validGoldenPathReportPath(value: string): boolean {
  return (
    value.toLowerCase().trim().endsWith("live_e2e_report.md") && validEvidenceReportPath(value)
  );
}

function validScreenshotPath(value: string): boolean {
  return hasObservedBenchmarkEvidencePath(value, [".png"]);
}
