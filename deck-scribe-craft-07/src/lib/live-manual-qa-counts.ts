import type { LiveManualQaEvidence, LiveManualQaIssue } from "./live-manual-qa-evidence";

export function manualQaCountShapeIssues(
  evidence: LiveManualQaEvidence,
): readonly LiveManualQaIssue[] {
  const invalidFields = [
    invalidCountField("criticalErrorCount", evidence.criticalErrorCount),
    invalidCountField("mockIndicatorCount", evidence.mockIndicatorCount),
    invalidCountField("placeholderOutputCount", evidence.placeholderOutputCount),
  ].filter((field) => field.length > 0);
  return invalidFields.length === 0
    ? []
    : [
        {
          code: "invalid_manual_qa_count",
          message: "Manual QA counters must be non-negative integers.",
          refs: invalidFields,
        },
      ];
}

export function safeManualQaCount(value: number): number {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function invalidCountField(fieldName: string, value: number): string {
  return Number.isInteger(value) && value >= 0 ? "" : `${fieldName}:${String(value)}`;
}
