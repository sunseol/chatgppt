import { describe, expect, test } from "bun:test";
import {
  parseDf246PackagedManualQaInput,
  produceDf246PackagedManualQaEvidence,
} from "./df246-packaged-manual-qa-evidence-producer";

const PACKAGE_SHA = "e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6";
const CAPTURED_AT = "2026-06-22T06:45:00.000Z";
const SESSION_PATH = "docs/live-evidence/manual-qa/session-20260622.json";

describe("DF-246 packaged manual QA evidence producer", () => {
  test("produces ready manual QA evidence from a non-developer session bundle", () => {
    // Given
    const input = parseDf246PackagedManualQaInput(completeInput());

    // When
    const evidence = produceDf246PackagedManualQaEvidence(input);

    // Then
    expect(evidence.evidenceKind).toBe("df246-packaged-manual-qa-evidence");
    expect(evidence.status).toBe("ready");
    expect(evidence.manualQaValidation).toEqual({ kind: "ready" });
    expect(evidence.releaseBlockers).toEqual([]);
  });

  test("keeps manual QA evidence blocked when the tester is the developer", () => {
    // Given
    const sessionEvidence = {
      ...completeInput().sessionEvidence,
      testerRole: "developer",
    };
    const input = parseDf246PackagedManualQaInput({
      ...completeInput(),
      sessionEvidence: {
        ...sessionEvidence,
        sessionEvidencePayload: {
          ...sessionEvidence.sessionEvidencePayload,
          testerRole: "developer",
        },
      },
    });

    // When
    const evidence = produceDf246PackagedManualQaEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain("DF-246 manual QA validation is blocked");
  });

  test("keeps release handoff blocked when no non-developer session bundle exists yet", () => {
    // Given
    const input = parseDf246PackagedManualQaInput({
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
      manualQaCandidatePackageSha256: PACKAGE_SHA,
      checklistPath: "docs/live-manual-qa-checklist.md",
      packageRecheckPath: "docs/live-evidence/release/df245-package-recheck-20260622.json",
    });

    // When
    const evidence = produceDf246PackagedManualQaEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.sessionEvidencePath).toBeNull();
    expect(evidence.testerRole).toBeNull();
    expect(evidence.releaseBlockers).toEqual([
      "DF-246 manual QA session evidence JSON is missing",
      "DF-246 manual QA validation is blocked",
    ]);
    expect(evidence.manualQaValidation).toEqual({
      kind: "blocked",
      issues: [
        {
          code: "missing_manual_qa_session_evidence",
          message: "Manual QA must cite a persisted non-synthetic session evidence bundle.",
          refs: ["missing"],
        },
      ],
    });
  });

  test("keeps manual QA evidence blocked when package hashes drift", () => {
    // Given
    const input = parseDf246PackagedManualQaInput({
      ...completeInput(),
      manualQaCandidatePackageSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });

    // When
    const evidence = produceDf246PackagedManualQaEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain(
      "DF-246 manual QA package hash does not match the release package",
    );
  });

  test("rejects malformed manual QA input at the boundary", () => {
    // Given
    const malformedInput = {
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
    };

    // When / Then
    expect(() => parseDf246PackagedManualQaInput(malformedInput)).toThrow(
      "Invalid DF-246 packaged manual QA input",
    );
  });
});

function completeInput() {
  const sessionEvidence = completeSessionEvidence();
  return {
    capturedAt: CAPTURED_AT,
    packageArchiveSha256: PACKAGE_SHA,
    manualQaCandidatePackageSha256: PACKAGE_SHA,
    checklistPath: "docs/live-manual-qa-checklist.md",
    packageRecheckPath: "docs/live-evidence/release/df245-package-recheck-20260622.json",
    sessionEvidence,
  };
}

function completeSessionEvidence() {
  const evidence = {
    testerRole: "non_developer",
    sessionEvidencePath: SESSION_PATH,
    sessionDurationMs: 540_000,
    setupTasks: ["new_project", "login_check", "prompt_input"],
    approvalTargetChecks: [
      { targetId: "research_pack", understood: true },
      { targetId: "slide_generation", understood: true },
      { targetId: "export", understood: true },
    ],
    openedRealSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
    finalReportSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
    regeneratedSlideIds: ["slide-3"],
    editedTitleSlideIds: ["slide-3"],
    openedExports: ["png", "project", "report"],
    criticalErrorCount: 0,
    mockIndicatorCount: 0,
    placeholderOutputCount: 0,
    severityIssueListPresent: true,
    issueLog: [],
  };
  return {
    ...evidence,
    sessionEvidencePayload: {
      kind: "manual_qa_session",
      evidencePath: evidence.sessionEvidencePath,
      testerRole: evidence.testerRole,
      sessionDurationMs: evidence.sessionDurationMs,
      setupTasks: evidence.setupTasks,
      approvalTargetChecks: evidence.approvalTargetChecks,
      openedRealSourceUrls: evidence.openedRealSourceUrls,
      finalReportSourceUrls: evidence.finalReportSourceUrls,
      regeneratedSlideIds: evidence.regeneratedSlideIds,
      editedTitleSlideIds: evidence.editedTitleSlideIds,
      openedExports: evidence.openedExports,
      criticalErrorCount: evidence.criticalErrorCount,
      mockIndicatorCount: evidence.mockIndicatorCount,
      placeholderOutputCount: evidence.placeholderOutputCount,
      severityIssueListPresent: evidence.severityIssueListPresent,
      issueLog: evidence.issueLog,
      capturedAt: "2026-06-22T06:40:00.000Z",
    },
  };
}
