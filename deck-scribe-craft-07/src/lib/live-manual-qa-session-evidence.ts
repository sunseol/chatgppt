import type { LiveManualQaIssue } from "./live-manual-qa-evidence";
import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

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
