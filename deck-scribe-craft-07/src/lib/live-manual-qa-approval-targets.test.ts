import { describe, expect, test } from "bun:test";
import {
  evaluateLiveManualQaEvidence,
  formatLiveManualQaEvidenceSummary,
} from "./live-manual-qa-evidence";
import { completeLiveManualQaEvidence as completeEvidence } from "./live-manual-qa-test-fixtures";

describe("live manual QA approval target evidence", () => {
  test("blocks duplicated approval target checks from inflating coverage", () => {
    // Given
    const result = evaluateLiveManualQaEvidence(
      completeEvidence({
        approvalTargetChecks: [
          { targetId: "research_pack", understood: true },
          { targetId: "research_pack", understood: true },
          { targetId: "slide_generation", understood: true },
          { targetId: "export", understood: true },
        ],
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_approval_target_check"]);
    expect(result.issues[0]?.refs).toEqual(["research_pack"]);
  });

  test("summarizes distinct approval targets instead of repeated checks", () => {
    // Given
    const summary = formatLiveManualQaEvidenceSummary(
      completeEvidence({
        approvalTargetChecks: [
          { targetId: "research_pack", understood: true },
          { targetId: "research_pack", understood: true },
          { targetId: "export", understood: true },
        ],
      }),
    );

    // Then
    expect(summary.includes("approval targets checked: 2")).toBe(true);
  });
});
