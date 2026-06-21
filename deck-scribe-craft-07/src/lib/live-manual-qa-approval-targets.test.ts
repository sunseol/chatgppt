import { describe, expect, test } from "bun:test";
import {
  MANUAL_QA_EXPORTS,
  MANUAL_QA_SETUP_TASKS,
  evaluateLiveManualQaEvidence,
  formatLiveManualQaEvidenceSummary,
  type LiveManualQaEvidence,
} from "./live-manual-qa-evidence";

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

function completeEvidence(patch: Partial<LiveManualQaEvidence> = {}): LiveManualQaEvidence {
  return {
    testerRole: "non_developer",
    sessionEvidencePath: "docs/live-evidence/manual-qa/session-20260619.json",
    sessionDurationMs: 540_000,
    setupTasks: MANUAL_QA_SETUP_TASKS,
    approvalTargetChecks: [
      { targetId: "research_pack", understood: true },
      { targetId: "slide_generation", understood: true },
      { targetId: "export", understood: true },
    ],
    openedRealSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
    finalReportSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
    regeneratedSlideIds: ["slide-3"],
    editedTitleSlideIds: ["slide-3"],
    openedExports: MANUAL_QA_EXPORTS,
    criticalErrorCount: 0,
    mockIndicatorCount: 0,
    placeholderOutputCount: 0,
    severityIssueListPresent: true,
    issueLog: [],
    ...patch,
  };
}
