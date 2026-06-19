import { realSourceOpenIssues } from "./live-manual-qa-source-evidence";

export const MANUAL_QA_SETUP_TASKS = ["new_project", "login_check", "prompt_input"] as const;

export const MANUAL_QA_EXPORTS = ["png", "project", "report"] as const;

export const MANUAL_QA_APPROVAL_TARGETS = ["research_pack", "slide_generation", "export"] as const;

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
  | "setup_over_time"
  | "missing_approval_target_check"
  | "approval_target_misunderstood"
  | "missing_real_source_open"
  | "invalid_real_source_url"
  | "placeholder_real_source_url"
  | "opened_source_not_in_report"
  | "missing_slide_regeneration"
  | "missing_title_edit"
  | "missing_export_open"
  | "critical_issue_present"
  | "mock_indicator_present"
  | "placeholder_output_present"
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
    ...setupIssues(evidence),
    ...approvalIssues(evidence.approvalTargetChecks),
    ...realSourceOpenIssues(evidence.openedRealSourceUrls, evidence.finalReportSourceUrls),
    ...presenceIssue(
      "missing_slide_regeneration",
      evidence.regeneratedSlideIds,
      "At least one slide must be regenerated during manual QA.",
    ),
    ...presenceIssue(
      "missing_title_edit",
      evidence.editedTitleSlideIds,
      "At least one title edit must survive the QA flow.",
    ),
    ...exportIssues(evidence.openedExports),
    ...countIssue(
      "critical_issue_present",
      evidence.criticalErrorCount + p0IssueCount(evidence.issueLog),
      "Critical errors and P0 manual QA issues must be zero.",
    ),
    ...countIssue(
      "mock_indicator_present",
      evidence.mockIndicatorCount,
      "Mock indicators must not appear in production manual QA.",
    ),
    ...countIssue(
      "placeholder_output_present",
      evidence.placeholderOutputCount,
      "Placeholder outputs must not appear in manual QA artifacts.",
    ),
    ...severityListIssues(evidence),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function formatLiveManualQaEvidenceSummary(evidence: LiveManualQaEvidence): string {
  const severities = severityCounts(evidence.issueLog);
  return [
    "# DF-246 Live Manual QA",
    `tester role: ${evidence.testerRole}`,
    `setup target: 10 minutes · actual: ${minutes(evidence.sessionDurationMs)} minutes`,
    `setup tasks: ${evidence.setupTasks.join(", ") || "missing"}`,
    `approval targets checked: ${evidence.approvalTargetChecks.length}`,
    `real sources opened: ${nonEmpty(evidence.openedRealSourceUrls).length}`,
    `report sources: ${nonEmpty(evidence.finalReportSourceUrls).length}`,
    `regenerated slides: ${nonEmpty(evidence.regeneratedSlideIds).join(", ") || "missing"}`,
    `title edits: ${nonEmpty(evidence.editedTitleSlideIds).join(", ") || "missing"}`,
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
  const withinTime =
    evidence.sessionDurationMs <= TEN_MINUTES_MS && evidence.sessionDurationMs >= 0;
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

function approvalIssues(
  checks: readonly ManualQaApprovalTargetCheck[],
): readonly LiveManualQaIssue[] {
  const present = new Set(nonEmpty(checks.map((check) => check.targetId)));
  const missing = MANUAL_QA_APPROVAL_TARGETS.filter((target) => !present.has(target));
  const failed = checks.filter((check) => !check.understood || check.targetId.trim().length === 0);
  return [
    ...(failed.length === 0
      ? []
      : [
          issue(
            "approval_target_misunderstood",
            "Tester must understand every approval button target.",
            failed.map((check) => check.targetId || "missing approval target"),
          ),
        ]),
    ...(missing.length === 0
      ? []
      : [
          issue(
            "missing_approval_target_check",
            "Manual QA must check every approval button target.",
            missing,
          ),
        ]),
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

function presenceIssue(
  code: LiveManualQaIssueCode,
  values: readonly string[],
  message: string,
): readonly LiveManualQaIssue[] {
  return nonEmpty(values).length > 0 ? [] : [issue(code, message, ["missing"])];
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

function minutes(ms: number): string {
  return (ms / 60_000).toFixed(1);
}

function issue(
  code: LiveManualQaIssueCode,
  message: string,
  refs: readonly string[],
): LiveManualQaIssue {
  return { code, message, refs };
}
