import type { LiveManualQaIssue, ManualQaIssueLogEntry } from "./live-manual-qa-evidence";

const MANUAL_QA_SEVERITIES: ReadonlySet<string> = new Set(["P0", "P1", "P2"]);

export function manualQaIssueLogIssues(
  issueLog: readonly ManualQaIssueLogEntry[],
): readonly LiveManualQaIssue[] {
  const invalidRefs = issueLog.flatMap((entry, index) =>
    [
      MANUAL_QA_SEVERITIES.has(entry.severity) ? "" : `issue:${index}:invalid_severity`,
      entry.title.trim().length > 0 ? "" : `issue:${index}:missing_title`,
      entry.description.trim().length > 0 ? "" : `issue:${index}:missing_description`,
    ].filter((ref) => ref.length > 0),
  );
  return invalidRefs.length === 0
    ? []
    : [
        {
          code: "invalid_manual_qa_issue_log",
          message: "Manual QA issue log entries must include severity, title, and notes.",
          refs: invalidRefs,
        },
      ];
}
