import { describe, expect, test } from "bun:test";
import {
  MANUAL_QA_EXPORTS,
  MANUAL_QA_SETUP_TASKS,
  evaluateLiveManualQaEvidence,
  formatLiveManualQaEvidenceSummary,
  type LiveManualQaEvidence,
} from "./live-manual-qa-evidence";

describe("live manual QA evidence", () => {
  test("passes a complete non-developer 10-minute manual QA session", () => {
    // Given
    const evidence = completeEvidence();

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result).toEqual({ kind: "ready" });
  });

  test("summarizes the DF-246 manual QA checklist and severity counts", () => {
    // Given
    const evidence = completeEvidence({
      issueLog: [
        {
          severity: "P2",
          title: "Button label hesitation",
          description: "Tester paused before naming the report export button.",
        },
      ],
    });

    // When
    const summary = formatLiveManualQaEvidenceSummary(evidence);

    // Then
    expect(summary.includes("DF-246 Live Manual QA")).toBe(true);
    expect(summary.includes("tester role: non_developer")).toBe(true);
    expect(summary.includes("10 minutes")).toBe(true);
    expect(summary.includes("real sources opened: 1")).toBe(true);
    expect(summary.includes("exports opened: png, project, report")).toBe(true);
    expect(summary.includes("P0: 0 · P1: 0 · P2: 1")).toBe(true);
  });

  test("blocks overtime setup, misunderstood approval targets, missing artifacts, and false live evidence", () => {
    // Given
    const evidence = completeEvidence({
      sessionDurationMs: 601_000,
      setupTasks: ["new_project"],
      approvalTargetChecks: [{ targetId: "research_pack", understood: false }],
      openedRealSourceUrls: [],
      regeneratedSlideIds: [],
      editedTitleSlideIds: [],
      openedExports: ["png"],
      criticalErrorCount: 1,
      mockIndicatorCount: 1,
      placeholderOutputCount: 1,
      severityIssueListPresent: false,
      issueLog: [
        {
          severity: "P0",
          title: "Export crash",
          description: "Export crashed before project package could be opened.",
        },
      ],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "setup_over_time",
      "approval_target_misunderstood",
      "missing_approval_target_check",
      "missing_real_source_open",
      "missing_slide_regeneration",
      "missing_title_edit",
      "missing_export_open",
      "critical_issue_present",
      "mock_indicator_present",
      "placeholder_output_present",
      "missing_severity_issue_list",
    ]);
  });

  test("blocks developer self-test evidence", () => {
    // Given
    const evidence = completeEvidence({ testerRole: "developer" });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).includes("tester_not_non_developer")).toBe(
      true,
    );
  });

  test("blocks manual QA records without persisted session evidence", () => {
    // Given
    const evidence = {
      ...completeEvidence(),
      sessionEvidencePath: "test-fixtures/manual-qa-session.json",
    };

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks invalid manual QA counts without letting them cancel P0 issues", () => {
    // Given
    const evidence = completeEvidence({
      criticalErrorCount: -1,
      mockIndicatorCount: 0.5,
      placeholderOutputCount: Number.NaN,
      issueLog: [
        {
          severity: "P0",
          title: "Billing confusion",
          description: "Tester thought image API-key billing was free.",
        },
      ],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "invalid_manual_qa_count",
      "critical_issue_present",
    ]);
  });

  test("blocks manual QA evidence that skips approval targets", () => {
    // Given
    const evidence = completeEvidence({
      approvalTargetChecks: [{ targetId: "research_pack", understood: true }],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_approval_target_check"]);
  });

  test("blocks opened source evidence that is not a real URL", () => {
    // Given
    const evidence = completeEvidence({ openedRealSourceUrls: ["not-a-url"] });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_real_source_url"]);
  });

  test("blocks placeholder domains as opened source evidence", () => {
    // Given
    const evidence = completeEvidence({
      openedRealSourceUrls: ["https://example.com/live-source"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["placeholder_real_source_url"]);
  });

  test("blocks opened source evidence that is absent from the final report sources", () => {
    // Given
    const evidence = completeEvidence({
      openedRealSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
      finalReportSourceUrls: ["https://www.nasa.gov/"],
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
