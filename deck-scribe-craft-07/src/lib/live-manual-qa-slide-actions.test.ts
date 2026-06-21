import { describe, expect, test } from "bun:test";
import {
  MANUAL_QA_EXPORTS,
  MANUAL_QA_SETUP_TASKS,
  evaluateLiveManualQaEvidence,
  type LiveManualQaEvidence,
} from "./live-manual-qa-evidence";

describe("live manual QA slide actions", () => {
  test("blocks placeholder slide ids as regeneration or title edit evidence", () => {
    // Given
    const evidence = completeEvidence({
      regeneratedSlideIds: ["placeholder-slide"],
      editedTitleSlideIds: ["template-title-slide"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_slide_regeneration",
      "missing_title_edit",
      "invalid_manual_qa_slide_action",
    ]);
  });

  test("blocks non-canonical slide ids as regeneration or title edit evidence", () => {
    // Given
    const evidence = completeEvidence({
      regeneratedSlideIds: [" slide-3 "],
      editedTitleSlideIds: [" slide-3 "],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_slide_regeneration",
      "missing_title_edit",
      "invalid_manual_qa_slide_action",
    ]);
  });

  test("blocks contaminated slide action ids even when another action id is valid", () => {
    // Given
    const evidence = completeEvidence({
      regeneratedSlideIds: ["slide-3", "placeholder-slide"],
      editedTitleSlideIds: ["slide-3", "template-title-slide"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_manual_qa_slide_action"]);
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
    regeneratedSlideIds: ["slide-3"],
    editedTitleSlideIds: ["slide-3"],
    openedExports: MANUAL_QA_EXPORTS,
    criticalErrorCount: 0,
    mockIndicatorCount: 0,
    placeholderOutputCount: 0,
    severityIssueListPresent: true,
    issueLog: [],
    finalReportSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
    ...patch,
  };
}
