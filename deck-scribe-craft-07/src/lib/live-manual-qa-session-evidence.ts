import type { LiveManualQaIssue } from "./live-manual-qa-evidence";

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
  if (!value.endsWith(".json")) return false;
  const normalized = value.toLowerCase();
  if (normalized.startsWith("/") || /^[a-z]:[\\/]/.test(normalized)) return false;
  return !["mock", "fixture", "test", "fake"].some((marker) => normalized.includes(marker));
}
