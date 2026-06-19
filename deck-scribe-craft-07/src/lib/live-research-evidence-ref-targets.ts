import type {
  LiveResearchEvidenceIssue,
  LiveResearchEvidenceReference,
} from "./live-research-evidence";

export function validateEvidenceRefClaimTargets(
  evidenceRefs: readonly LiveResearchEvidenceReference[],
  claimIds: ReadonlySet<string>,
): readonly LiveResearchEvidenceIssue[] {
  return evidenceRefs
    .filter((evidenceRef) => !claimIds.has(evidenceRef.claimId))
    .map((evidenceRef) => ({
      code: "unknown_reference",
      severity: "fatal",
      claimId: evidenceRef.claimId,
      message: `Unknown evidence claim: ${evidenceRef.claimId}`,
    }));
}
