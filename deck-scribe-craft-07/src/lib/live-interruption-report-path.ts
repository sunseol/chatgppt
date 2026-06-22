import type { LiveInterruptionIssue } from "./live-interruption-matrix";
import { hasNonSyntheticEvidencePath } from "./live-evidence-path";

const LIVE_INTERRUPTION_REPORT_PATH = "docs/live-interruption-matrix.md";

export function interruptionReportPathIssues(reportPath: string): readonly LiveInterruptionIssue[] {
  return validInterruptionReportPath(reportPath)
    ? []
    : [
        {
          code: "missing_interruption_report",
          message: "Live interruption matrix report is required.",
          refs: [reportPath || "missing"],
        },
      ];
}

function validInterruptionReportPath(value: string): boolean {
  if (value !== LIVE_INTERRUPTION_REPORT_PATH) return false;
  if (!hasNonSyntheticEvidencePath(value, [".md"])) return false;
  const segments = value
    .toLowerCase()
    .split(/[/\\._-]+/)
    .filter(Boolean);
  return !["mock", "fixture", "fixtures", "test", "tests", "fake", "fakes"].some((marker) =>
    segments.includes(marker),
  );
}
