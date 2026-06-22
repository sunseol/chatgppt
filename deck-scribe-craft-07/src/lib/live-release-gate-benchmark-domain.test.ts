import { describe, expect, test } from "bun:test";
import { evaluateLiveInitialReleaseGate } from "./live-release-gate";
import { readyLiveReleaseGateInput as readyInput } from "./live-release-gate-test-fixtures";

describe("live initial release gate benchmark failure domains", () => {
  test("blocks benchmark failure domains outside the DF-242 taxonomy", () => {
    // Given
    const input = readyInput();
    const result = evaluateLiveInitialReleaseGate({
      ...input,
      liveBenchmarks: input.liveBenchmarks.map((benchmark) =>
        benchmark.id === "revision_regeneration"
          ? { ...benchmark, failureDomain: "billing" }
          : benchmark,
      ),
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "live_benchmark_invalid_failure_domain",
    ]);
    expect(result.blockers[0]?.refs).toEqual(["revision_regeneration:billing"]);
  });
});
