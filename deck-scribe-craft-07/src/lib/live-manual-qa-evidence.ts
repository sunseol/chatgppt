import { manualQaCountShapeIssues, safeManualQaCount } from "./live-manual-qa-counts";
import {
  MANUAL_QA_APPROVAL_TARGETS,
  approvalIssues,
  countDistinctApprovalTargetChecks,
} from "./live-manual-qa-approval-targets";
import { manualQaIssueLogIssues } from "./live-manual-qa-issue-log";
import { liveManualQaSlideActionIssues, liveSlideIds } from "./live-manual-qa-slide-actions";
import { realSourceOpenIssues } from "./live-manual-qa-source-evidence";
import { sessionEvidenceIssues } from "./live-manual-qa-session-evidence";

export const MANUAL_QA_SETUP_TASKS = ["new_project", "login_check", "prompt_input"] as const;

export const MANUAL_QA_EXPORTS = ["png", "project", "report"] as const;

export { MANUAL_QA_APPROVAL_TARGETS };

export const MANUAL_QA_TESTER_ROLES = ["non_developer", "developer"] as const;

export type ManualQaSetupTask = (typeof MANUAL_QA_SETUP_TASKS)[number];
export type ManualQaExport = (typeof MANUAL_QA_EXPORTS)[number];
export type ManualQaSeverity = "P0" | "P1" | "P2";
export type ManualQaTesterRole = (typeof MANUAL_QA_TESTER_ROLES)[number];

export type ManualQaApprovalTargetCheck = {
  readonly targetId: string;
  readonly understood: boolean;
};

export type ManualQaIssueLogEntry = {
  readonly severity: ManualQaSeverity;
  readonly title: string;
  readonly description: string;
};

export type LiveManualQaEvidence = {
  readonly testerRole: ManualQaTesterRole;
  readonly sessionEvidencePath: string;
  readonly sessionEvidencePayload?: unknown;
  readonly sessionDurationMs: number;
  readonly setupTasks: readonly ManualQaSetupTask[];
  readonly approvalTargetChecks: readonly ManualQaApprovalTargetCheck[];
  readonly openedRealSourceUrls: readonly string[];
  readonly finalReportSourceUrls: readonly string[];
  readonly regeneratedSlideIds: readonly string[];
  readonly editedTitleSlideIds: readonly string[];
  readonly openedExports: readonly ManualQaExport[];
  readonly criticalErrorCount: number;
  readonly mockIndicatorCount: number;
  readonly placeholderOutputCount: number;
  readonly severityIssueListPresent: boolean;
  readonly issueLog: readonly ManualQaIssueLogEntry[];
};

export type LiveManualQaIssueCode =
  | "tester_not_non_developer"
  | "missing_manual_qa_session_evidence"
  | "setup_over_time"
  | "missing_approval_target_check"
  | "approval_target_misunderstood"
  | "missing_real_source_open"
  | "invalid_real_source_url"
  | "placeholder_real_source_url"
  | "opened_source_not_in_report"
  | "duplicate_approval_target_check"
  | "missing_slide_regeneration"
  | "missing_title_edit"
  | "invalid_manual_qa_slide_action"
  | "missing_export_open"
  | "invalid_manual_qa_count"
  | "critical_issue_present"
  | "mock_indicator_present"
  | "placeholder_output_present"
  | "invalid_manual_qa_issue_log"
  | "missing_severity_issue_list";

export type LiveManualQaIssue = {
  readonly code: LiveManualQaIssueCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export type LiveManualQaEvidenceResult =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveManualQaIssue[] };

const TEN_MINUTES_MS = 600_000;

export function evaluateLiveManualQaEvidence(
  evidence: LiveManualQaEvidence,
): LiveManualQaEvidenceResult {
  const issues = [
    ...testerIssues(evidence),
    ...sessionEvidenceIssues(evidence),
    ...setupIssues(evidence),
    ...approvalIssues(evidence.approvalTargetChecks),
    ...realSourceOpenIssues(evidence.openedRealSourceUrls, evidence.finalReportSourceUrls),
    ...liveManualQaSlideActionIssues(evidence.regeneratedSlideIds, evidence.editedTitleSlideIds),
    ...exportIssues(evidence.openedExports),
    ...manualQaCountShapeIssues(evidence),
    ...countIssue(
      "critical_issue_present",
      safeManualQaCount(evidence.criticalErrorCount) + p0IssueCount(evidence.issueLog),
      "Critical errors and P0 manual QA issues must be zero.",
    ),
    ...countIssue(
      "mock_indicator_present",
      safeManualQaCount(evidence.mockIndicatorCount),
      "Mock indicators must not appear in production manual QA.",
    ),
    ...countIssue(
      "placeholder_output_present",
      safeManualQaCount(evidence.placeholderOutputCount),
      "Placeholder outputs must not appear in manual QA artifacts.",
    ),
    ...manualQaIssueLogIssues(evidence.issueLog),
    ...severityListIssues(evidence),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function formatLiveManualQaEvidenceSummary(evidence: LiveManualQaEvidence): string {
  const severities = severityCounts(evidence.issueLog);
  return [
    "# DF-246 Live Manual QA",
    `tester role: ${evidence.testerRole}`,
    `setup target: 10 minutes · actual: ${(evidence.sessionDurationMs / 60_000).toFixed(1)} minutes`,
    `setup tasks: ${evidence.setupTasks.join(", ") || "missing"}`,
    `approval targets checked: ${countDistinctApprovalTargetChecks(evidence.approvalTargetChecks)}`,
    `real sources opened: ${nonEmpty(evidence.openedRealSourceUrls).length}`,
    `report sources: ${nonEmpty(evidence.finalReportSourceUrls).length}`,
    `regenerated slides: ${liveSlideIds(evidence.regeneratedSlideIds).join(", ") || "missing"}`,
    `title edits: ${liveSlideIds(evidence.editedTitleSlideIds).join(", ") || "missing"}`,
    `exports opened: ${evidence.openedExports.join(", ") || "missing"}`,
    `critical errors: ${evidence.criticalErrorCount}`,
    `mock indicators: ${evidence.mockIndicatorCount}`,
    `placeholder outputs: ${evidence.placeholderOutputCount}`,
    `severity log: P0: ${severities.P0} · P1: ${severities.P1} · P2: ${severities.P2}`,
  ].join("\n");
}

function testerIssues(evidence: LiveManualQaEvidence): readonly LiveManualQaIssue[] {
  return evidence.testerRole === "non_developer"
    ? []
    : [
        issue(
          "tester_not_non_developer",
          "Manual QA must be performed by a non-developer tester.",
          [evidence.testerRole],
        ),
      ];
}

function setupIssues(evidence: LiveManualQaEvidence): readonly LiveManualQaIssue[] {
  const present = new Set(evidence.setupTasks);
  const missing = MANUAL_QA_SETUP_TASKS.filter((task) => !present.has(task));
  const withinTime = evidence.sessionDurationMs <= TEN_MINUTES_MS && evidence.sessionDurationMs > 0;
  return missing.length === 0 && withinTime
    ? []
    : [
        issue(
          "setup_over_time",
          "New project, login check, and prompt input must complete within 10 minutes.",
          [...missing, `${evidence.sessionDurationMs}ms`],
        ),
      ];
}

function exportIssues(exports: readonly ManualQaExport[]): readonly LiveManualQaIssue[] {
  const present = new Set(exports);
  const missing = MANUAL_QA_EXPORTS.filter((artifact) => !present.has(artifact));
  return missing.length === 0
    ? []
    : [
        issue(
          "missing_export_open",
          "PNG, project, and report outputs must all be found and opened.",
          missing,
        ),
      ];
}

function countIssue(
  code: LiveManualQaIssueCode,
  count: number,
  message: string,
): readonly LiveManualQaIssue[] {
  return count === 0 ? [] : [issue(code, message, [`count:${count}`])];
}

function severityListIssues(evidence: LiveManualQaEvidence): readonly LiveManualQaIssue[] {
  return evidence.severityIssueListPresent
    ? []
    : [
        issue(
          "missing_severity_issue_list",
          "Manual QA must include a severity-based issue list.",
          ["severity issue list"],
        ),
      ];
}

function p0IssueCount(issueLog: readonly ManualQaIssueLogEntry[]): number {
  return issueLog.filter((entry) => entry.severity === "P0").length;
}

function severityCounts(
  issueLog: readonly ManualQaIssueLogEntry[],
): Record<ManualQaSeverity, number> {
  return issueLog.reduce(
    (counts, entry) => ({ ...counts, [entry.severity]: counts[entry.severity] + 1 }),
    { P0: 0, P1: 0, P2: 0 },
  );
}

function nonEmpty(values: readonly string[]): readonly string[] {
  return values.filter((value) => value.trim().length > 0);
}

function issue(
  code: LiveManualQaIssueCode,
  message: string,
  refs: readonly string[],
): LiveManualQaIssue {
  return { code, message, refs };
}
