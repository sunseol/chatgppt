import {
  LIVE_BENCHMARK_IDS,
  type LiveBenchmarkEvidenceBundle,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

export function formatLiveBenchmarkEvidenceSummary(bundle: LiveBenchmarkEvidenceBundle): string {
  const passedLiveCount = countPassedLiveBenchmarks(bundle.runs);
  const mockScoresCounted = bundle.runs.filter(
    (run) => run.status === "passed" && (run.source !== "live" || run.mockScore > 0),
  ).length;
  return [
    "# DF-242 Live Benchmarks",
    `Report: ${bundle.reportPath || "missing"}`,
    `Package archive: ${bundle.packageArchiveSha256 || "missing"}`,
    `Passed live benchmarks: ${passedLiveCount} of ${LIVE_BENCHMARK_IDS.length}`,
    `Mock scores counted: ${mockScoresCounted}`,
    ...bundle.runs.map((run) => `${run.id}: ${run.status}/${run.failureDomain}`),
  ].join("\n");
}

function countPassedLiveBenchmarks(runs: readonly LiveBenchmarkRun[]): number {
  return runs.filter(
    (run) =>
      LIVE_BENCHMARK_IDS.includes(run.id) &&
      run.status === "passed" &&
      run.source === "live" &&
      run.goldenPathCompleted,
  ).length;
}
