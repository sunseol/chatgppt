import {
  MANUAL_QA_APPROVAL_TARGETS,
  MANUAL_QA_EXPORTS,
  MANUAL_QA_SETUP_TASKS,
  type LiveManualQaEvidence,
} from "./live-manual-qa-evidence";

export type LiveManualQaSessionPayloadFixture = {
  readonly kind: "manual_qa_session";
  readonly evidencePath: string;
  readonly testerRole: LiveManualQaEvidence["testerRole"];
  readonly sessionDurationMs: LiveManualQaEvidence["sessionDurationMs"];
  readonly setupTasks: LiveManualQaEvidence["setupTasks"];
  readonly approvalTargetChecks: LiveManualQaEvidence["approvalTargetChecks"];
  readonly openedRealSourceUrls: LiveManualQaEvidence["openedRealSourceUrls"];
  readonly finalReportSourceUrls: LiveManualQaEvidence["finalReportSourceUrls"];
  readonly regeneratedSlideIds: LiveManualQaEvidence["regeneratedSlideIds"];
  readonly editedTitleSlideIds: LiveManualQaEvidence["editedTitleSlideIds"];
  readonly openedExports: LiveManualQaEvidence["openedExports"];
  readonly criticalErrorCount: LiveManualQaEvidence["criticalErrorCount"];
  readonly mockIndicatorCount: LiveManualQaEvidence["mockIndicatorCount"];
  readonly placeholderOutputCount: LiveManualQaEvidence["placeholderOutputCount"];
  readonly severityIssueListPresent: LiveManualQaEvidence["severityIssueListPresent"];
  readonly issueLog: LiveManualQaEvidence["issueLog"];
  readonly capturedAt: string;
};

export function completeLiveManualQaEvidence(
  patch: Partial<LiveManualQaEvidence> = {},
): LiveManualQaEvidence {
  const evidence = {
    testerRole: "non_developer",
    sessionEvidencePath: "docs/live-evidence/manual-qa/session-20260619.json",
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
  } satisfies LiveManualQaEvidence;
  return {
    ...evidence,
    sessionEvidencePayload:
      "sessionEvidencePayload" in patch
        ? patch.sessionEvidencePayload
        : completeLiveManualQaSessionPayload(evidence),
  };
}

export function completeLiveManualQaSessionPayload(
  evidence: LiveManualQaEvidence,
): LiveManualQaSessionPayloadFixture {
  return {
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
    capturedAt: "2026-06-21T20:40:00Z",
  };
}
