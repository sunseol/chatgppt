import { describe, expect, test } from "bun:test";
import { evaluateLiveBenchmarkEvidence } from "../src/lib/live-benchmark-evidence";
import { evaluateLiveGoldenPathE2EBundle } from "../src/lib/live-golden-path-e2e";
import { buildDf241Df242CandidateEvidence } from "./df241-df242-candidate-evidence-support";

const PACKAGE_SHA = "e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6";

describe("DF-241/DF-242 candidate evidence collector", () => {
  test("builds a blocked candidate bundle from real collected artifacts", () => {
    // Given
    const evidence = buildDf241Df242CandidateEvidence({
      packageArchiveSha256: PACKAGE_SHA,
    });

    // When
    const goldenPathResult = evaluateLiveGoldenPathE2EBundle(evidence.goldenPathBundle);
    const benchmarkResult = evaluateLiveBenchmarkEvidence(evidence.benchmarkBundle);

    // Then
    expect(goldenPathResult.kind).toBe("blocked");
    expect(benchmarkResult.kind).toBe("blocked");
    expect(evidence.goldenPathBundle.sources).toHaveLength(3);
    expect(evidence.goldenPathBundle.imageArtifacts).toHaveLength(6);
    expect(
      evidence.goldenPathBundle.lineage.some((item) => item.promptVersion.includes("deck_plan")),
    ).toBe(true);
    expect(benchmarkResult.kind === "blocked" ? benchmarkResult.passedLiveCount : -1).toBe(0);
  });
});
