import { describe, expect, test } from "bun:test";
import { evaluateLiveInitialReleaseGate } from "./live-release-gate";
import { readyLiveReleaseGateInput as readyInput } from "./live-release-gate-test-fixtures";

describe("live initial release gate packaged evidence index", () => {
  test("blocks release when the packaged live evidence index is not ready", () => {
    // Given
    const input = readyInput();
    const result = evaluateLiveInitialReleaseGate({
      ...input,
      packagedLiveEvidenceIndex: {
        kind: "blocked",
        issues: [
          {
            code: "packaged_live_release_ready_before_upstream",
            message:
              "DF-247 release evidence cannot be ready while upstream packaged evidence is blocked.",
            refs: ["DF-241", "DF-242", "DF-243"],
          },
        ],
      },
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "packaged_live_release_ready_before_upstream",
    ]);
    expect(result.blockers[0]?.refs).toEqual(["DF-241", "DF-242", "DF-243"]);
  });
});
