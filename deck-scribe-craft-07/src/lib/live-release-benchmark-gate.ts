import { LIVE_BENCHMARK_IDS } from "./live-benchmark-evidence";
import type { LiveBenchmarkEvidence, LiveReleaseBlocker } from "./live-release-gate";

const REQUIRED_RELEASE_BENCHMARK_IDS = new Set<string>(LIVE_BENCHMARK_IDS);

export function benchmarkBlockers(
  benchmarks: readonly LiveBenchmarkEvidence[],
  passedBenchmarkCount: number,
): readonly LiveReleaseBlocker[] {
  return hasAllRequiredBenchmarkScenarios(benchmarks) && passedBenchmarkCount >= 4
    ? []
    : [
        {
          code: "live_benchmark_shortfall",
          message: "At least four of five Live benchmarks must pass.",
          refs: ["DF-242"],
        },
      ];
}

export function distinctCleanPassedBenchmarkCount(
  benchmarks: readonly LiveBenchmarkEvidence[],
): number {
  return new Set(
    benchmarks
      .filter(
        (benchmark) =>
          REQUIRED_RELEASE_BENCHMARK_IDS.has(benchmark.id) &&
          benchmark.status === "passed" &&
          benchmark.failureDomain === "none",
      )
      .map((benchmark) => benchmark.id),
  ).size;
}

function hasAllRequiredBenchmarkScenarios(benchmarks: readonly LiveBenchmarkEvidence[]): boolean {
  const present = new Set(benchmarks.map((benchmark) => benchmark.id));
  return LIVE_BENCHMARK_IDS.every((benchmarkId) => present.has(benchmarkId));
}
