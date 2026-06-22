import type { LiveBenchmarkRun } from "./live-benchmark-evidence";

export function evidenceCountMismatchRefs(runs: readonly LiveBenchmarkRun[]): readonly string[] {
  return runs
    .filter((run) => run.status === "passed")
    .flatMap((run) => [
      ...countMismatchRef(
        run.id,
        "screenshots",
        run.outputBundle.screenshotCount,
        nonblankCount(run.outputBundle.screenshotPaths ?? []),
      ),
      ...countMismatchRef(
        run.id,
        "sources",
        run.outputBundle.sourceCount,
        nonblankCount(run.outputBundle.sourceArtifactIds),
      ),
      ...countMismatchRef(
        run.id,
        "images",
        run.outputBundle.imageArtifactCount,
        nonblankCount(run.outputBundle.liveImageArtifactIds),
      ),
    ]);
}

function countMismatchRef(
  benchmarkId: string,
  label: string,
  claimed: number,
  actual: number,
): readonly string[] {
  return claimed === actual ? [] : [`${benchmarkId}:${label}=${claimed}/${actual}`];
}

function nonblankCount(values: readonly string[]): number {
  return values.map((value) => value.trim()).filter(Boolean).length;
}
