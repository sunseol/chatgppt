import type { ArtifactRecord } from "./artifacts";
import { createArtifactRecord } from "./artifacts";
import type { ApprovalLogEntry, DeckPlan, StepKey } from "./deck-types";
import { invalidatedAfter } from "./workflow-engine";
import type { SlideSpecParseResult } from "./slide-spec-parser";
import { parseDeckPlanMarkdown } from "./slide-spec-parser";

export interface PlanDraftUpdate {
  readonly plan: DeckPlan;
  readonly parseResult: SlideSpecParseResult;
  readonly invalidated: Partial<Record<StepKey, true>>;
}

export type ApprovedPlanResult =
  | {
      readonly kind: "approved";
      readonly plan: DeckPlan;
      readonly artifact: ArtifactRecord;
      readonly parseResult: SlideSpecParseResult;
    }
  | {
      readonly kind: "blocked";
      readonly parseResult: SlideSpecParseResult;
    };

export interface CreatePlanDraftInput {
  readonly plan: DeckPlan;
  readonly markdown: string;
}

export interface CreateApprovedPlanInput {
  readonly projectId: string;
  readonly plan: DeckPlan;
  readonly markdown: string;
  readonly existingApprovals: readonly ApprovalLogEntry[];
  readonly approvedAt?: number;
}

export function createPlanDraftUpdate(input: CreatePlanDraftInput): PlanDraftUpdate {
  const parseResult = parseDeckPlanMarkdown(input.markdown);
  return {
    plan: {
      id: input.plan.id,
      markdown: input.markdown,
      slides: [...parseResult.specs],
    },
    parseResult,
    invalidated: invalidatedAfter("plan"),
  };
}

export function createApprovedPlan(input: CreateApprovedPlanInput): ApprovedPlanResult {
  const parseResult = parseDeckPlanMarkdown(input.markdown);
  if (!parseResult.valid) {
    return { kind: "blocked", parseResult };
  }

  const planContent = JSON.stringify({
    id: input.plan.id,
    markdown: input.markdown,
    slides: parseResult.specs,
  });
  const artifact = createArtifactRecord({
    projectId: input.projectId,
    type: "plan",
    version: nextPlanVersion(input.existingApprovals),
    content: planContent,
    createdAt: input.approvedAt,
  });

  return {
    kind: "approved",
    artifact,
    parseResult,
    plan: {
      id: input.plan.id,
      markdown: input.markdown,
      slides: [...parseResult.specs],
      approvedHash: artifact.hash,
    },
  };
}

function nextPlanVersion(approvals: readonly ApprovalLogEntry[]): number {
  return approvals.filter((entry) => entry.stage === "plan").length + 1;
}
