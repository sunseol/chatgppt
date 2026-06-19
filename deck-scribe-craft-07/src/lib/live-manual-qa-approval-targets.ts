import type { LiveManualQaIssue, ManualQaApprovalTargetCheck } from "./live-manual-qa-evidence";

export const MANUAL_QA_APPROVAL_TARGETS = ["research_pack", "slide_generation", "export"] as const;

export function approvalIssues(
  checks: readonly ManualQaApprovalTargetCheck[],
): readonly LiveManualQaIssue[] {
  const targetIds = checks.map((check) => check.targetId);
  const present = new Set(nonEmpty(targetIds));
  const missing = MANUAL_QA_APPROVAL_TARGETS.filter((target) => !present.has(target));
  const failed = checks.filter((check) => !check.understood || check.targetId.trim().length === 0);
  const duplicates = duplicateApprovalTargets(targetIds);
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
    ...(duplicates.length === 0
      ? []
      : [
          issue(
            "duplicate_approval_target_check",
            "Manual QA approval target checks must be distinct evidence events.",
            duplicates,
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

export function countDistinctApprovalTargetChecks(
  checks: readonly ManualQaApprovalTargetCheck[],
): number {
  return new Set(nonEmpty(checks.map((check) => check.targetId.trim()))).size;
}

function duplicateApprovalTargets(targetIds: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const targetId of nonEmpty(targetIds.map((value) => value.trim()))) {
    if (seen.has(targetId)) duplicates.add(targetId);
    seen.add(targetId);
  }
  return [...duplicates];
}

function nonEmpty(values: readonly string[]): readonly string[] {
  return values.filter((value) => value.trim().length > 0);
}

function issue(
  code: LiveManualQaIssue["code"],
  message: string,
  refs: readonly string[],
): LiveManualQaIssue {
  return { code, message, refs };
}
