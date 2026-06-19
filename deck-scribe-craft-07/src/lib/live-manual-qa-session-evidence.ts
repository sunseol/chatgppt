import type { LiveManualQaIssue } from "./live-manual-qa-evidence";
import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

export function sessionEvidenceIssues(sessionEvidencePath: string): readonly LiveManualQaIssue[] {
  return validSessionEvidencePath(sessionEvidencePath)
    ? []
    : [
        {
          code: "missing_manual_qa_session_evidence",
          message: "Manual QA must cite a persisted non-synthetic session evidence bundle.",
          refs: [sessionEvidencePath || "missing"],
        },
      ];
}

function validSessionEvidencePath(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    hasNonSyntheticJsonEvidencePath(value) &&
    normalized.includes("manual-qa") &&
    normalized.includes("session")
  );
}
