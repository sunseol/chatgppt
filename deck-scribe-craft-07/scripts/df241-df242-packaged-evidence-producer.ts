import {
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkEvidenceResult,
} from "../src/lib/live-benchmark-evidence";
import {
  evaluateLiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EResult,
} from "../src/lib/live-golden-path-e2e";
import type { Df241Df242PackagedRunInput } from "./df241-df242-packaged-evidence-schema";
export {
  Df241Df242PackagedEvidenceParseError,
  parseDf241Df242PackagedRunInput,
  parseDf241Df242PackagedRunJson,
} from "./df241-df242-packaged-evidence-schema";

export type Df241Df242PackagedEvidence = {
  readonly capturedAt: string;
  readonly evidenceKind: "df241-df242-packaged-run-evidence";
  readonly status: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly goldenPath: {
    readonly result: LiveGoldenPathE2EResult;
    readonly completedSteps: readonly string[];
    readonly sourceCount: number;
    readonly imageArtifactCount: number;
    readonly textLineageCount: number;
  };
  readonly benchmark: {
    readonly result: LiveBenchmarkEvidenceResult;
    readonly scenarioCount: number;
    readonly passedLiveCount: number;
  };
  readonly releaseBlockers: readonly string[];
};

export function produceDf241Df242PackagedEvidence(
  input: Df241Df242PackagedRunInput,
): Df241Df242PackagedEvidence {
  const goldenPathResult = evaluateLiveGoldenPathE2EBundle(input.goldenPathBundle);
  const benchmarkResult = evaluateLiveBenchmarkEvidence(input.benchmarkBundle);
  const releaseBlockers = releaseBlockerMessages(input, goldenPathResult, benchmarkResult);
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df241-df242-packaged-run-evidence",
    status: releaseBlockers.length === 0 ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    goldenPath: {
      result: goldenPathResult,
      completedSteps: input.goldenPathBundle.completedSteps,
      sourceCount: input.goldenPathBundle.sources.length,
      imageArtifactCount: input.goldenPathBundle.imageArtifacts.length,
      textLineageCount:
        input.goldenPathBundle.lineage.length - input.goldenPathBundle.imageArtifacts.length,
    },
    benchmark: {
      result: benchmarkResult,
      scenarioCount: input.benchmarkBundle.runs.length,
      passedLiveCount: benchmarkResult.passedLiveCount,
    },
    releaseBlockers,
  };
}

function releaseBlockerMessages(
  input: Df241Df242PackagedRunInput,
  goldenPathResult: LiveGoldenPathE2EResult,
  benchmarkResult: LiveBenchmarkEvidenceResult,
): readonly string[] {
  return [
    ...(input.packageArchiveSha256 === input.benchmarkBundle.packageArchiveSha256
      ? []
      : ["Top-level package SHA-256 does not match the benchmark bundle package SHA-256"]),
    ...(goldenPathResult.kind === "ready" ? [] : ["DF-241 golden path evidence is blocked"]),
    ...(benchmarkResult.kind === "ready" ? [] : ["DF-242 benchmark evidence is blocked"]),
  ];
}
