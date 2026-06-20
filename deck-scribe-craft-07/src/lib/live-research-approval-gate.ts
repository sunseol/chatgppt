import {
  type LiveResearchEvidenceIssue,
  type LiveResearchEvidenceReference,
  validateLiveResearchEvidence,
} from "./live-research-evidence";
import { hashContent } from "./artifacts";
import {
  evaluateApprovalProvenanceGate,
  type ProviderArtifactProvenance,
  type ProviderProvenanceIssue,
} from "./provider-provenance";
import { sourceCaptureApprovalIssues } from "./live-research-source-capture-gate";
import { getPendingResearchReinforcementRequests } from "./research-review-actions";
import type { ResearchPack } from "./research-types";

type LiveResearchReviewIssueCode =
  | "pending_reinforcement_request"
  | "research_pack_provenance_mismatch"
  | "source_missing_live_capture"
  | "source_capture_incomplete";

export type LiveResearchApprovalIssue = {
  readonly code:
    | LiveResearchEvidenceIssue["code"]
    | ProviderProvenanceIssue["code"]
    | LiveResearchReviewIssueCode;
  readonly message: string;
  readonly claimId?: string;
  readonly sourceId?: string;
  readonly datasetId?: string;
  readonly artifactId?: string;
  readonly requestId?: string;
};

export type LiveResearchApprovalGate =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveResearchApprovalIssue[] };

export type LiveResearchDeckPlanInput = {
  readonly researchPackId: string;
  readonly approvedResearchPackHash: string;
};

export function evaluateLiveResearchApprovalGate(input: {
  readonly pack: ResearchPack;
  readonly evidenceRefs: readonly LiveResearchEvidenceReference[];
  readonly provenanceLineage: readonly ProviderArtifactProvenance[];
}): LiveResearchApprovalGate {
  const evidenceReport = validateLiveResearchEvidence({
    pack: input.pack,
    evidenceRefs: input.evidenceRefs,
  });
  const provenanceGate = evaluateApprovalProvenanceGate(input.provenanceLineage);
  const evidenceIssues = evidenceReport.fatalIssues.map(evidenceIssue);
  const provenanceIssues =
    provenanceGate.kind === "blocked" ? provenanceGate.issues.map(providerIssue) : [];
  const packProvenanceIssues = researchPackProvenanceIssues(input.pack, input.provenanceLineage);
  const sourceIssues = sourceCaptureApprovalIssues(input.pack.sources);
  const reviewIssues = getPendingResearchReinforcementRequests(input.pack).map((request) => ({
    code: "pending_reinforcement_request" as const,
    message: `Pending research reinforcement request must be resolved before approval: ${request.prompt}`,
    requestId: request.id,
  }));
  const issues = [
    ...provenanceIssues,
    ...packProvenanceIssues,
    ...sourceIssues,
    ...evidenceIssues,
    ...reviewIssues,
  ];

  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function createLiveResearchDeckPlanInput(
  pack: ResearchPack,
): LiveResearchDeckPlanInput | undefined {
  if (!pack.approvedHash) return undefined;
  if (pack.approvedHash !== createLiveResearchApprovedHash(pack)) return undefined;
  const gate = evaluateLiveResearchApprovalGate({
    pack,
    evidenceRefs: pack.liveEvidenceRefs ?? [],
    provenanceLineage: pack.provenanceLineage ?? [],
  });
  if (gate.kind === "blocked") return undefined;
  return {
    researchPackId: pack.id,
    approvedResearchPackHash: pack.approvedHash,
  };
}

export function createLiveResearchApprovedHash(pack: ResearchPack): string {
  return hashContent(JSON.stringify({ ...pack, approvedHash: undefined }));
}

function evidenceIssue(issue: LiveResearchEvidenceIssue): LiveResearchApprovalIssue {
  return {
    code: issue.code,
    message: issue.message,
    ...(issue.claimId === undefined ? {} : { claimId: issue.claimId }),
    ...(issue.sourceId === undefined ? {} : { sourceId: issue.sourceId }),
    ...(issue.datasetId === undefined ? {} : { datasetId: issue.datasetId }),
  };
}

function providerIssue(issue: ProviderProvenanceIssue): LiveResearchApprovalIssue {
  return {
    code: issue.code,
    message: issue.message,
    ...(issue.artifactId === undefined ? {} : { artifactId: issue.artifactId }),
  };
}

function researchPackProvenanceIssues(
  pack: ResearchPack,
  lineage: readonly ProviderArtifactProvenance[],
): readonly LiveResearchApprovalIssue[] {
  if (lineage.length === 0) return [];
  const packArtifactId = pack.id.trim();
  const hasPackProvenance = lineage.some(
    (provenance) => provenance.artifactId.trim() === packArtifactId,
  );
  if (hasPackProvenance) return [];
  return [
    {
      code: "research_pack_provenance_mismatch",
      artifactId: pack.id,
      message: "Research approval requires provider provenance for the current Research Pack.",
    },
  ];
}
