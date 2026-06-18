import { hashContent } from "./artifacts";
import {
  createLiveResearchDeckPlanInput,
  evaluateLiveResearchApprovalGate,
  type LiveResearchApprovalIssue,
  type LiveResearchDeckPlanInput,
} from "./live-research-approval-gate";
import {
  createApprovedResearchPackArtifact,
  type ApprovedResearchPackArtifact,
} from "./research-pack";
import type { ResearchPack } from "./research-types";

export type LiveResearchApprovalPatchResult =
  | {
      readonly kind: "ready";
      readonly approvedHash: string;
      readonly deckPlanInput: LiveResearchDeckPlanInput;
      readonly approvalArtifact: ApprovedResearchPackArtifact;
      readonly patch: {
        readonly research: ResearchPack;
        readonly stage: "PLANNING";
      };
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveResearchApprovalIssue[];
    };

export function createLiveResearchApprovalPatch(input: {
  readonly pack: ResearchPack;
  readonly projectId: string;
  readonly version: number;
  readonly approvedAt: number;
}): LiveResearchApprovalPatchResult {
  const gate = evaluateLiveResearchApprovalGate({
    pack: input.pack,
    evidenceRefs: input.pack.liveEvidenceRefs ?? [],
    provenanceLineage: input.pack.provenanceLineage ?? [],
  });
  if (gate.kind === "blocked") return { kind: "blocked", issues: gate.issues };

  const approvedHash = hashContent(JSON.stringify({ ...input.pack, approvedHash: undefined }));
  const research = { ...input.pack, approvedHash };
  const approvalArtifact = createApprovedResearchPackArtifact({
    projectId: input.projectId,
    pack: research,
    version: input.version,
    approvedAt: input.approvedAt,
  });
  return {
    kind: "ready",
    approvedHash,
    approvalArtifact,
    deckPlanInput: createLiveResearchDeckPlanInput(research) ?? {
      researchPackId: research.id,
      approvedResearchPackHash: approvedHash,
    },
    patch: {
      research,
      stage: "PLANNING",
    },
  };
}
