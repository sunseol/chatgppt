import type {
  LiveResearchEvidenceIssue,
  LiveResearchEvidenceReference,
} from "./live-research-evidence";

export function validateEvidenceRefClaimTargets(
  evidenceRefs: readonly LiveResearchEvidenceReference[],
  claimIds: ReadonlySet<string>,
): readonly LiveResearchEvidenceIssue[] {
  return [
    ...duplicateEvidenceRefIssues(evidenceRefs),
    ...nonCanonicalEvidenceRefIssues(evidenceRefs),
    ...evidenceRefs
      .filter((evidenceRef) => !claimIds.has(evidenceRef.claimId))
      .map((evidenceRef) => ({
        code: "unknown_reference" as const,
        severity: "fatal" as const,
        claimId: evidenceRef.claimId,
        message: `Unknown evidence claim: ${evidenceRef.claimId}`,
      })),
  ];
}

function nonCanonicalEvidenceRefIssues(
  evidenceRefs: readonly LiveResearchEvidenceReference[],
): readonly LiveResearchEvidenceIssue[] {
  return evidenceRefs.flatMap((evidenceRef) =>
    [evidenceRef.id, evidenceRef.claimId, evidenceRef.sourceId, evidenceRef.datasetId].some(
      isNonCanonicalNonBlank,
    )
      ? [
          {
            code: "noncanonical_evidence_reference" as const,
            severity: "fatal" as const,
            claimId: evidenceRef.claimId,
            message: "Persisted live research evidence reference ids must be canonical.",
          },
        ]
      : [],
  );
}

function duplicateEvidenceRefIssues(
  evidenceRefs: readonly LiveResearchEvidenceReference[],
): readonly LiveResearchEvidenceIssue[] {
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const evidenceRef of evidenceRefs) {
    if (seen.has(evidenceRef.id)) {
      duplicateIds.add(evidenceRef.id);
      continue;
    }
    seen.add(evidenceRef.id);
  }
  return [...duplicateIds].map((id) => ({
    code: "duplicate_evidence_reference",
    severity: "fatal",
    message: `Duplicate evidence reference id: ${id}`,
  }));
}

function isNonCanonicalNonBlank(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "" && value !== value.trim();
}
