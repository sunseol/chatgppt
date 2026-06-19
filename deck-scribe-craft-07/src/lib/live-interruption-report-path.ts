import type { LiveInterruptionIssue } from "./live-interruption-matrix";

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
  const normalized = value.toLowerCase().trim();
  if (!normalized.endsWith("live-interruption-matrix.md")) return false;
  const segments = normalized.split(/[/\\._-]+/).filter(Boolean);
  return !["mock", "fixture", "fixtures", "test", "tests", "fake", "fakes"].some((marker) =>
    segments.includes(marker),
  );
}
