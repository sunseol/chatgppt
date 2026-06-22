import { z } from "zod";
import type { LiveManualQaEvidence, LiveManualQaIssue } from "./live-manual-qa-evidence";
import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

const MANUAL_QA_SETUP_TASKS = ["new_project", "login_check", "prompt_input"] as const;
const MANUAL_QA_APPROVAL_TARGETS = ["research_pack", "slide_generation", "export"] as const;
const MANUAL_QA_EXPORTS = ["png", "project", "report"] as const;
const MANUAL_QA_SEVERITIES = ["P0", "P1", "P2"] as const;

const NON_OBSERVED_SESSION_MARKERS = [
  "template",
  "sample",
  "example",
  "placeholder",
  "generic",
  "notes",
  "tmp",
  "temp",
  "observer",
] as const;

const ManualQaApprovalTargetCheckPayloadSchema = z
  .object({
    targetId: z.enum(MANUAL_QA_APPROVAL_TARGETS),
    understood: z.boolean(),
  })
  .strict();

const ManualQaIssueLogEntryPayloadSchema = z
  .object({
    severity: z.enum(MANUAL_QA_SEVERITIES),
    title: z.string(),
    description: z.string(),
  })
  .strict();

const ManualQaSessionPayloadSchema = z
  .object({
    kind: z.literal("manual_qa_session"),
    evidencePath: z.string().min(1),
    testerRole: z.enum(["non_developer", "developer"]),
    sessionDurationMs: z.number().int().nonnegative(),
    setupTasks: z.array(z.enum(MANUAL_QA_SETUP_TASKS)),
    approvalTargetChecks: z.array(ManualQaApprovalTargetCheckPayloadSchema),
    openedRealSourceUrls: z.array(z.string()),
    finalReportSourceUrls: z.array(z.string()),
    regeneratedSlideIds: z.array(z.string()),
    editedTitleSlideIds: z.array(z.string()),
    openedExports: z.array(z.enum(MANUAL_QA_EXPORTS)),
    criticalErrorCount: z.unknown(),
    mockIndicatorCount: z.unknown(),
    placeholderOutputCount: z.unknown(),
    severityIssueListPresent: z.boolean(),
    issueLog: z.array(ManualQaIssueLogEntryPayloadSchema),
    capturedAt: z.string().datetime(),
  })
  .strict();

type ManualQaSessionPayload = z.infer<typeof ManualQaSessionPayloadSchema>;

export function sessionEvidenceIssues(
  evidence: LiveManualQaEvidence,
): readonly LiveManualQaIssue[] {
  return validSessionEvidencePath(evidence.sessionEvidencePath) && validSessionPayload(evidence)
    ? []
    : [
        {
          code: "missing_manual_qa_session_evidence",
          message: "Manual QA must cite a persisted non-synthetic session evidence bundle.",
          refs: [evidence.sessionEvidencePath || "missing"],
        },
      ];
}

function validSessionEvidencePath(value: string): boolean {
  if (value.trim() !== value) return false;
  const normalized = value.toLowerCase();
  return (
    hasNonSyntheticJsonEvidencePath(value) &&
    normalized.startsWith("docs/live-evidence/") &&
    normalized.includes("manual-qa") &&
    normalized.includes("session") &&
    !NON_OBSERVED_SESSION_MARKERS.some((marker) => normalized.includes(marker))
  );
}

function validSessionPayload(evidence: LiveManualQaEvidence): boolean {
  const parsed = ManualQaSessionPayloadSchema.safeParse(evidence.sessionEvidencePayload);
  return parsed.success && sessionPayloadMatchesEvidence(parsed.data, evidence);
}

function sessionPayloadMatchesEvidence(
  payload: ManualQaSessionPayload,
  evidence: LiveManualQaEvidence,
): boolean {
  return (
    payload.evidencePath === evidence.sessionEvidencePath &&
    payload.testerRole === evidence.testerRole &&
    payload.sessionDurationMs === evidence.sessionDurationMs &&
    sameStrings(payload.setupTasks, evidence.setupTasks) &&
    sameApprovalTargetChecks(payload.approvalTargetChecks, evidence.approvalTargetChecks) &&
    sameStrings(payload.openedRealSourceUrls, evidence.openedRealSourceUrls) &&
    sameStrings(payload.finalReportSourceUrls, evidence.finalReportSourceUrls) &&
    sameStrings(payload.regeneratedSlideIds, evidence.regeneratedSlideIds) &&
    sameStrings(payload.editedTitleSlideIds, evidence.editedTitleSlideIds) &&
    sameStrings(payload.openedExports, evidence.openedExports) &&
    Object.is(payload.criticalErrorCount, evidence.criticalErrorCount) &&
    Object.is(payload.mockIndicatorCount, evidence.mockIndicatorCount) &&
    Object.is(payload.placeholderOutputCount, evidence.placeholderOutputCount) &&
    payload.severityIssueListPresent === evidence.severityIssueListPresent &&
    sameIssueLog(payload.issueLog, evidence.issueLog)
  );
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameApprovalTargetChecks(
  left: ManualQaSessionPayload["approvalTargetChecks"],
  right: LiveManualQaEvidence["approvalTargetChecks"],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        value.targetId === other.targetId &&
        value.understood === other.understood
      );
    })
  );
}

function sameIssueLog(
  left: ManualQaSessionPayload["issueLog"],
  right: LiveManualQaEvidence["issueLog"],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        value.severity === other.severity &&
        value.title === other.title &&
        value.description === other.description
      );
    })
  );
}
