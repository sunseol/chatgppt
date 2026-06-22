import { describe, expect, test } from "bun:test";
import { evaluateLiveBenchmarkEvidence } from "../src/lib/live-benchmark-evidence";
import { evaluateLiveGoldenPathE2EBundle } from "../src/lib/live-golden-path-e2e";
import { buildDf241Df242CandidateEvidence } from "./df241-df242-candidate-evidence-support";
import {
  parseDf241Df242PackagedRunInput,
  produceDf241Df242PackagedEvidence,
} from "./df241-df242-packaged-evidence-producer";

const PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";
const CAPTURED_AT = "2026-06-22T02:30:00.000Z";

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

  test("produces honest packaged-run evidence from parsed DF-241 and DF-242 bundles", () => {
    // Given
    const candidate = buildDf241Df242CandidateEvidence({
      packageArchiveSha256: PACKAGE_SHA,
    });

    // When
    const parsed = parseDf241Df242PackagedRunInput({
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
      goldenPathBundle: candidate.goldenPathBundle,
      benchmarkBundle: candidate.benchmarkBundle,
    });
    const evidence = produceDf241Df242PackagedEvidence(parsed);

    // Then
    expect(evidence.evidenceKind).toBe("df241-df242-packaged-run-evidence");
    expect(evidence.status).toBe("blocked");
    expect(evidence.goldenPath.result.kind).toBe("blocked");
    expect(evidence.benchmark.result.kind).toBe("blocked");
    expect(evidence.benchmark.passedLiveCount).toBe(0);
    expect(evidence.releaseBlockers).toContain("DF-241 golden path evidence is blocked");
    expect(evidence.releaseBlockers).toContain("DF-242 benchmark evidence is blocked");
  });

  test("rejects malformed packaged-run input at the JSON boundary", () => {
    // Given
    const malformedInput = {
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
    };

    // When / Then
    expect(() => parseDf241Df242PackagedRunInput(malformedInput)).toThrow(
      "Invalid DF-241/DF-242 packaged run input",
    );
  });
});
