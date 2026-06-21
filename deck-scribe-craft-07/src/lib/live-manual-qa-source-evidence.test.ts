import { describe, expect, test } from "bun:test";
import {
  MANUAL_QA_APPROVAL_TARGETS,
  MANUAL_QA_EXPORTS,
  MANUAL_QA_SETUP_TASKS,
  evaluateLiveManualQaEvidence,
  type LiveManualQaEvidence,
} from "./live-manual-qa-evidence";

describe("live manual QA source evidence", () => {
  test("blocks reserved documentation IPs as real opened sources", () => {
    // Given
    const evidence = completeEvidence({
      openedRealSourceUrls: ["https://203.0.113.10/source"],
      finalReportSourceUrls: ["https://203.0.113.10/source"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["placeholder_real_source_url"]);
  });

  test("blocks opened source URLs that only become valid after trimming", () => {
    // Given
    const evidence = completeEvidence({
      openedRealSourceUrls: [" https://www.w3.org/TR/WCAG22/ "],
      finalReportSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_real_source_url"]);
  });

  test("blocks final report source URLs that only match after trimming", () => {
    // Given
    const evidence = completeEvidence({
      openedRealSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
      finalReportSourceUrls: [" https://www.w3.org/TR/WCAG22/ "],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["opened_source_not_in_report"]);
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
