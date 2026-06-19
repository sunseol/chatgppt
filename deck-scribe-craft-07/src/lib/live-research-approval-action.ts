import {
  createLiveResearchApprovedHash,
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

  const approvedHash = createLiveResearchApprovedHash(input.pack);
  const research = { ...input.pack, approvedHash };
  const deckPlanInput = createLiveResearchDeckPlanInput(research);
  if (deckPlanInput === undefined) {
    throw new Error("Approved live research pack must produce a deck-plan handoff input.");
  }
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
    deckPlanInput,
    patch: {
      research,
      stage: "PLANNING",
    },
  };
}
