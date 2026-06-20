import { LIVE_BENCHMARK_IDS } from "./live-benchmark-evidence";
import type { LiveBenchmarkEvidence, LiveReleaseBlocker } from "./live-release-gate";

const REQUIRED_RELEASE_BENCHMARK_IDS = new Set<string>(LIVE_BENCHMARK_IDS);

export function benchmarkBlockers(
  benchmarks: readonly LiveBenchmarkEvidence[],
  passedBenchmarkCount: number,
): readonly LiveReleaseBlocker[] {
  const conflicts = conflictingBenchmarkIds(benchmarks);
  return [
    ...(conflicts.length === 0
      ? []
      : [
          blocker(
            "live_benchmark_status_conflict",
            "Live benchmark evidence must not contain contradictory scenario results.",
            conflicts,
          ),
        ]),
    ...(hasAllRequiredBenchmarkScenarios(benchmarks) && passedBenchmarkCount >= 4
      ? []
      : [
          blocker("live_benchmark_shortfall", "At least four of five Live benchmarks must pass.", [
            "DF-242",
          ]),
        ]),
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

function conflictingBenchmarkIds(benchmarks: readonly LiveBenchmarkEvidence[]): readonly string[] {
  const outcomesById = new Map<string, Set<string>>();
  for (const benchmark of benchmarks) {
    if (!REQUIRED_RELEASE_BENCHMARK_IDS.has(benchmark.id)) continue;
    const outcomes = outcomesById.get(benchmark.id) ?? new Set<string>();
    outcomes.add(`${benchmark.status}:${benchmark.failureDomain}`);
    outcomesById.set(benchmark.id, outcomes);
  }
  return LIVE_BENCHMARK_IDS.filter((benchmarkId) => (outcomesById.get(benchmarkId)?.size ?? 0) > 1);
}

function blocker(
  code: LiveReleaseBlocker["code"],
  message: string,
  refs: readonly string[],
): LiveReleaseBlocker {
  return { code, message, refs };
}
