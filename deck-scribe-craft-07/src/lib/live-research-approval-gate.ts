import {
  type LiveResearchEvidenceIssue,
  type LiveResearchEvidenceReference,
  validateLiveResearchEvidence,
} from "./live-research-evidence";
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
  const sourceIssues = sourceCaptureApprovalIssues(input.pack.sources);
  const reviewIssues = getPendingResearchReinforcementRequests(input.pack).map((request) => ({
    code: "pending_reinforcement_request" as const,
    message: `Pending research reinforcement request must be resolved before approval: ${request.prompt}`,
    requestId: request.id,
  }));
  const issues = [...provenanceIssues, ...sourceIssues, ...evidenceIssues, ...reviewIssues];

  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function createLiveResearchDeckPlanInput(
  pack: ResearchPack,
): LiveResearchDeckPlanInput | undefined {
  if (!pack.approvedHash) return undefined;
  return {
    researchPackId: pack.id,
    approvedResearchPackHash: pack.approvedHash,
  };
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
