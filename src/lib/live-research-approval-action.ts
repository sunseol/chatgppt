import { hashContent } from "./artifacts";
import {
  createLiveResearchDeckPlanInput,
  evaluateLiveResearchApprovalGate,
  type LiveResearchApprovalIssue,
  type LiveResearchDeckPlanInput,
} from "./live-research-approval-gate";
import type { ResearchPack } from "./research-types";

export type LiveResearchApprovalPatchResult =
  | {
      readonly kind: "ready";
      readonly approvedHash: string;
      readonly deckPlanInput: LiveResearchDeckPlanInput;
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
}): LiveResearchApprovalPatchResult {
  const gate = evaluateLiveResearchApprovalGate({
    pack: input.pack,
    evidenceRefs: input.pack.liveEvidenceRefs ?? [],
    provenanceLineage: input.pack.provenanceLineage ?? [],
  });
  if (gate.kind === "blocked") return { kind: "blocked", issues: gate.issues };

  const approvedHash = hashContent(JSON.stringify({ ...input.pack, approvedHash: undefined }));
  const research = { ...input.pack, approvedHash };
  return {
    kind: "ready",
    approvedHash,
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
