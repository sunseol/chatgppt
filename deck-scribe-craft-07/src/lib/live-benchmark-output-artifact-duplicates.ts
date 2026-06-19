import type { LiveBenchmarkId, LiveBenchmarkRun } from "./live-benchmark-evidence";

export function duplicatePassedArtifactRefs(
  runs: readonly LiveBenchmarkRun[],
  artifactIdsForRun: (run: LiveBenchmarkRun) => readonly string[],
): readonly string[] {
  const seen = new Map<string, LiveBenchmarkId>();
  const duplicates: string[] = [];
  for (const run of runs) {
    if (run.status !== "passed") continue;
    const runArtifactIds = new Set(
      artifactIdsForRun(run)
        .map((artifactId) => artifactId.trim())
        .filter(Boolean),
    );
    for (const artifactId of runArtifactIds) {
      const firstRunId = seen.get(artifactId);
      if (firstRunId === undefined) {
        seen.set(artifactId, run.id);
        continue;
      }
      if (firstRunId === run.id) continue;
      duplicates.push(`${firstRunId}:${run.id}:${artifactId}`);
    }
  }
  return duplicates;
}
