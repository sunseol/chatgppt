import { describe, expect, test } from "bun:test";
import {
  MANUAL_QA_APPROVAL_TARGETS,
  MANUAL_QA_EXPORTS,
  MANUAL_QA_SETUP_TASKS,
  evaluateLiveManualQaEvidence,
  type LiveManualQaEvidence,
} from "./live-manual-qa-evidence";

describe("live manual QA session evidence", () => {
  test("blocks developer-local absolute session evidence paths", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: "/Users/jake/chatgppt/manual-qa/session-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks file URL session evidence paths", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: "file:///Users/jake/chatgppt/manual-qa/session-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });
});

function completeEvidence(patch: Partial<LiveManualQaEvidence> = {}): LiveManualQaEvidence {
  return {
    testerRole: "non_developer",
    sessionEvidencePath: "manual-qa/session-20260619.json",
    sessionDurationMs: 540_000,
    setupTasks: MANUAL_QA_SETUP_TASKS,
    approvalTargetChecks: MANUAL_QA_APPROVAL_TARGETS.map((targetId) => ({
      targetId,
      understood: true,
    })),
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
