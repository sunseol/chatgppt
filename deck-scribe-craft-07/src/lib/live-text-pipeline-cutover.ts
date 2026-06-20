import type { DeckPlan, DesignSystem } from "./deck-types";
import { DesignSystemSchema } from "./design-system";
import { LayoutIRSchema, type LayoutIR } from "./layout-ir";
import { contextConsistencyIssues } from "./live-text-pipeline-context";
import { collectLiveTextPipelineProvenanceIssues } from "./live-text-pipeline-provenance";
import { repairTurnEvidenceIssues } from "./live-text-pipeline-repair-evidence";
import { parseDeckPlanMarkdown } from "./slide-spec-parser";
import type { ProviderArtifactProvenance, ProviderProvenanceIssue } from "./provider-provenance";

const MAX_SCHEMA_REPAIR_ATTEMPTS = 2;

export type LiveTextPipelineStage = "deck_plan" | "design_system" | "layout_ir";

export type LiveTextPipelineTurnArtifact<TArtifact> = {
  readonly artifact: TArtifact;
  readonly provenance: ProviderArtifactProvenance;
  readonly deckContextId: string;
};

export type LiveTextPipelineSlideContextRef = {
  readonly slideNumber: number;
  readonly deckContextId: string;
  readonly designSystemId: string;
};

export type LiveTextPipelineRepairAttempt = {
  readonly stage: LiveTextPipelineStage;
  readonly turnId: string;
  readonly issues: readonly string[];
};

export type LiveTextPipelineRecoveryAction = "retry_live_turn" | "manual_input";

export type LiveTextPipelineRecovery = {
  readonly stage: LiveTextPipelineStage;
  readonly message: string;
  readonly fixtureFallbackAllowed: false;
  readonly actions: readonly LiveTextPipelineRecoveryAction[];
};

export type LiveTextPipelineIssueCode =
  | ProviderProvenanceIssue["code"]
  | "non_codex_text_turn"
  | "non_production_text_turn"
  | "shared_live_turn"
  | "shared_live_artifact"
  | "shared_brief_research_input"
  | "missing_brief_input"
  | "missing_research_input"
  | "missing_plan_input"
  | "missing_design_input"
  | "text_pipeline_prompt_version_mismatch"
  | "invalid_repair_turn_evidence"
  | "schema_invalid"
  | "schema_repair_exhausted"
  | "slide_count_mismatch"
  | "deck_context_mismatch"
  | "design_system_mismatch";

export type LiveTextPipelineIssue = {
  readonly code: LiveTextPipelineIssueCode;
  readonly message: string;
  readonly stage?: LiveTextPipelineStage;
  readonly artifactId?: string;
  readonly slideNumber?: number;
};

export type LiveTextPipelineCutoverInput = {
  readonly approvedBriefArtifactId: string;
  readonly approvedResearchPackArtifactId: string;
  readonly deckContextId: string;
  readonly expectedSlideCount: number;
  readonly deckPlan: LiveTextPipelineTurnArtifact<DeckPlan>;
  readonly designSystem: LiveTextPipelineTurnArtifact<DesignSystem>;
  readonly layoutIr: LiveTextPipelineTurnArtifact<LayoutIR>;
  readonly slideContextRefs: readonly LiveTextPipelineSlideContextRef[];
  readonly repairAttempts: readonly LiveTextPipelineRepairAttempt[];
};

export type LiveTextPipelineRepairTurn = {
  readonly capability: "deckPlan" | "designSystem" | "layoutPrototype";
  readonly promptVersion: string;
  readonly attemptNumber: number;
  readonly maxAttempts: typeof MAX_SCHEMA_REPAIR_ATTEMPTS;
  readonly inputArtifactIds: readonly string[];
  readonly requiresLiveCodex: true;
};

export type LiveTextPipelineCutoverResult =
  | {
      readonly kind: "ready";
      readonly deckContextId: string;
      readonly designSystemId: string;
      readonly slideCount: number;
      readonly provenanceLineage: readonly ProviderArtifactProvenance[];
    }
  | {
      readonly kind: "repair_required";
      readonly stage: LiveTextPipelineStage;
      readonly issues: readonly LiveTextPipelineIssue[];
      readonly nextTurn: LiveTextPipelineRepairTurn;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveTextPipelineIssue[];
      readonly recovery: LiveTextPipelineRecovery;
    };

export function evaluateLiveTextPipelineCutover(
  input: LiveTextPipelineCutoverInput,
): LiveTextPipelineCutoverResult {
  const provenanceIssues = [...collectLiveTextPipelineProvenanceIssues(input)];
  if (provenanceIssues.length > 0) return blocked("deck_plan", provenanceIssues);

  const schemaResult = evaluateSchema(input);
  if (schemaResult !== undefined) return schemaResult;

  const consistencyIssues = contextConsistencyIssues(input);
  if (consistencyIssues.length > 0) return blocked("layout_ir", consistencyIssues);

  return {
    kind: "ready",
    deckContextId: input.deckContextId,
    designSystemId: input.designSystem.artifact.id,
    slideCount: input.expectedSlideCount,
    provenanceLineage: [
      input.deckPlan.provenance,
      input.designSystem.provenance,
      input.layoutIr.provenance,
    ],
  };
}

export function createLiveTextPipelineProviderFailureRecovery(input: {
  readonly stage: LiveTextPipelineStage;
  readonly message: string;
}): LiveTextPipelineRecovery {
  return {
    stage: input.stage,
    message: input.message,
    fixtureFallbackAllowed: false,
    actions: ["retry_live_turn", "manual_input"],
  };
}

function evaluateSchema(
  input: LiveTextPipelineCutoverInput,
): LiveTextPipelineCutoverResult | undefined {
  const deckPlanIssues = deckPlanSchemaIssues(input.deckPlan.artifact, input.expectedSlideCount);
  if (deckPlanIssues.length > 0) return repairOrBlocked(input, "deck_plan", deckPlanIssues);

  const designIssues = schemaIssues(
    "design_system",
    input.designSystem.provenance.artifactId,
    DesignSystemSchema.safeParse(input.designSystem.artifact),
  );
  if (designIssues.length > 0) return repairOrBlocked(input, "design_system", designIssues);

  const layoutIssues = schemaIssues(
    "layout_ir",
    input.layoutIr.provenance.artifactId,
    LayoutIRSchema.safeParse(input.layoutIr.artifact),
  );
  if (layoutIssues.length > 0) return repairOrBlocked(input, "layout_ir", layoutIssues);

  return undefined;
}

function deckPlanSchemaIssues(
  plan: DeckPlan,
  expectedSlideCount: number,
): readonly LiveTextPipelineIssue[] {
  const parsed = parseDeckPlanMarkdown(plan.markdown);
  return [
    ...parsed.issues.map((issue) => ({
      code: "schema_invalid" as const,
      stage: "deck_plan" as const,
      artifactId: plan.id,
      slideNumber: issue.slideNumber,
      message: issue.message,
    })),
    ...(plan.slides.length === expectedSlideCount && parsed.specs.length === expectedSlideCount
      ? []
      : [
          {
            code: "slide_count_mismatch" as const,
            stage: "deck_plan" as const,
            artifactId: plan.id,
            message: `Deck Plan must contain exactly ${expectedSlideCount} slides.`,
          },
        ]),
  ];
}

function schemaIssues(
  stage: LiveTextPipelineStage,
  artifactId: string,
  result: { readonly success: boolean; readonly error?: { readonly issues: readonly unknown[] } },
): readonly LiveTextPipelineIssue[] {
  if (result.success) return [];
  return (result.error?.issues ?? [{ message: "Schema validation failed." }]).map((issue) => ({
    code: "schema_invalid" as const,
    stage,
    artifactId,
    message:
      typeof issue === "object" && issue !== null && "message" in issue
        ? String(issue.message)
        : "Schema validation failed.",
  }));
}

function repairOrBlocked(
  input: LiveTextPipelineCutoverInput,
  stage: LiveTextPipelineStage,
  issues: readonly LiveTextPipelineIssue[],
): LiveTextPipelineCutoverResult {
  const repairEvidenceIssues = repairTurnEvidenceIssues(input, stage);
  if (repairEvidenceIssues.length > 0) return blocked(stage, repairEvidenceIssues);

  const attemptCount = input.repairAttempts.filter((attempt) => attempt.stage === stage).length;
  if (attemptCount >= MAX_SCHEMA_REPAIR_ATTEMPTS) {
    return blocked(stage, [
      ...issues,
      {
        code: "schema_repair_exhausted",
        stage,
        message: `Schema repair exhausted after ${MAX_SCHEMA_REPAIR_ATTEMPTS} live repair turns.`,
      },
    ]);
  }

  return {
    kind: "repair_required",
    stage,
    issues,
    nextTurn: {
      capability: capabilityForStage(stage),
      promptVersion: `${stage}_repair@v1`,
      attemptNumber: attemptCount + 1,
      maxAttempts: MAX_SCHEMA_REPAIR_ATTEMPTS,
      inputArtifactIds: [artifactIdForStage(input, stage)],
      requiresLiveCodex: true,
    },
  };
}

function blocked(
  stage: LiveTextPipelineStage,
  issues: readonly LiveTextPipelineIssue[],
): Extract<LiveTextPipelineCutoverResult, { readonly kind: "blocked" }> {
  return {
    kind: "blocked",
    issues,
    recovery: createLiveTextPipelineProviderFailureRecovery({
      stage,
      message:
        "Live text pipeline artifact is blocked; retry the Codex turn or collect manual input.",
    }),
  };
}

function capabilityForStage(
  stage: LiveTextPipelineStage,
): LiveTextPipelineRepairTurn["capability"] {
  if (stage === "deck_plan") return "deckPlan";
  if (stage === "design_system") return "designSystem";
  return "layoutPrototype";
}

function artifactIdForStage(input: LiveTextPipelineCutoverInput, stage: LiveTextPipelineStage) {
  if (stage === "deck_plan") return input.deckPlan.provenance.artifactId;
  if (stage === "design_system") return input.designSystem.provenance.artifactId;
  return input.layoutIr.provenance.artifactId;
}
