import type { LiveBenchmarkId, LiveBenchmarkRun } from "./live-benchmark-evidence";
import { hasNonSyntheticEvidencePath } from "./live-evidence-path";

export function duplicateOutputBundleRefs(runs: readonly LiveBenchmarkRun[]): readonly string[] {
  return duplicateRunRefs(runs, (run) =>
    validOutputBundlePath(run.outputBundlePath) ? [run.outputBundlePath] : [],
  );
}

export function duplicateOutputBundleReports(runs: readonly LiveBenchmarkRun[]): readonly string[] {
  return duplicateRunRefs(runs, (run) =>
    validEvidenceReportPath(run.outputBundle.reportPath, ".md")
      ? [run.outputBundle.reportPath]
      : [],
  );
}

export function duplicatePassedExportArtifacts(
  runs: readonly LiveBenchmarkRun[],
): readonly string[] {
  return duplicateRunRefs(
    runs.filter((run) => run.status === "passed"),
    (run) => {
      const exportArtifactId = run.outputBundle.exportArtifactId.trim();
      return exportArtifactId ? [exportArtifactId] : [];
    },
  );
}

function duplicateRunRefs(
  runs: readonly LiveBenchmarkRun[],
  refsForRun: (run: LiveBenchmarkRun) => readonly string[],
): readonly string[] {
  const seen = new Map<string, LiveBenchmarkId>();
  const duplicates: string[] = [];
  for (const run of runs) {
    const refs = new Set(
      refsForRun(run)
        .map((ref) => ref.trim())
        .filter(Boolean),
    );
    for (const ref of refs) {
      const firstRunId = seen.get(ref);
      if (firstRunId === undefined) {
        seen.set(ref, run.id);
        continue;
      }
      if (firstRunId === run.id) continue;
      duplicates.push(`${firstRunId}:${run.id}:${ref}`);
    }
  }
  return duplicates;
}

function validOutputBundlePath(value: string): boolean {
  return hasNonSyntheticEvidencePath(value, [".zip", ".json"]);
}

function validEvidenceReportPath(value: string, expectedSuffix: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (!normalized.endsWith(expectedSuffix)) return false;
  return hasNonSyntheticEvidencePath(value, [".md"]);
}
