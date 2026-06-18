import type { DeckPlan, DesignSystem } from "./deck-types";
import { DesignSystemSchema } from "./design-system";
import { LayoutIRSchema, type LayoutIR } from "./layout-ir";
import { parseDeckPlanMarkdown } from "./slide-spec-parser";
import {
  evaluateApprovalProvenanceGate,
  type ProviderArtifactProvenance,
  type ProviderProvenanceIssue,
} from "./provider-provenance";

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
  | "missing_plan_input"
  | "missing_design_input"
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
  const provenanceIssues = [
    ...liveCodexProvenanceIssues("deck_plan", input.deckPlan.provenance),
    ...liveCodexProvenanceIssues("design_system", input.designSystem.provenance),
    ...liveCodexProvenanceIssues("layout_ir", input.layoutIr.provenance),
    ...turnIdentityIssues(input),
    ...lineageIssues(input),
  ];
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

function liveCodexProvenanceIssues(
  stage: LiveTextPipelineStage,
  provenance: ProviderArtifactProvenance,
): readonly LiveTextPipelineIssue[] {
  const gate = evaluateApprovalProvenanceGate([provenance]);
  const gateIssues =
    gate.kind === "blocked" ? gate.issues.map((issue) => providerIssue(stage, issue)) : [];
  return [
    ...gateIssues,
    ...(provenance.providerKind === "codex"
      ? []
      : [
          {
            code: "non_codex_text_turn" as const,
            artifactId: provenance.artifactId,
            stage,
            message: "Deck plan, design system, and Layout IR must come from live Codex turns.",
          },
        ]),
    ...(provenance.executionMode === "production"
      ? []
      : [
          {
            code: "non_production_text_turn" as const,
            artifactId: provenance.artifactId,
            stage,
            message: "Text pipeline artifacts must come from production execution mode.",
          },
        ]),
  ];
}

function turnIdentityIssues(input: LiveTextPipelineCutoverInput): readonly LiveTextPipelineIssue[] {
  const turns = [
    input.deckPlan.provenance.turnId,
    input.designSystem.provenance.turnId,
    input.layoutIr.provenance.turnId,
  ];
  const completeTurns = turns.filter((turnId): turnId is string => turnId !== undefined);
  return new Set(completeTurns).size === completeTurns.length
    ? []
    : [
        {
          code: "shared_live_turn",
          message: "Deck plan, design system, and Layout IR must be generated by separate turns.",
        },
      ];
}

function lineageIssues(input: LiveTextPipelineCutoverInput): readonly LiveTextPipelineIssue[] {
  return [
    ...(input.designSystem.provenance.inputArtifactIds.includes(
      input.deckPlan.provenance.artifactId,
    )
      ? []
      : [
          {
            code: "missing_plan_input" as const,
            stage: "design_system" as const,
            artifactId: input.designSystem.provenance.artifactId,
            message: "Design System turn must cite the live Deck Plan artifact as input.",
          },
        ]),
    ...(input.layoutIr.provenance.inputArtifactIds.includes(input.deckPlan.provenance.artifactId) &&
    input.layoutIr.provenance.inputArtifactIds.includes(input.designSystem.provenance.artifactId)
      ? []
      : [
          {
            code: "missing_design_input" as const,
            stage: "layout_ir" as const,
            artifactId: input.layoutIr.provenance.artifactId,
            message:
              "Layout IR turn must cite both live Deck Plan and Design System artifacts as inputs.",
          },
        ]),
  ];
}

function contextConsistencyIssues(
  input: LiveTextPipelineCutoverInput,
): readonly LiveTextPipelineIssue[] {
  return [
    ...artifactContextIssues(input),
    ...slideContextIssues(input),
    ...(input.layoutIr.artifact.designSystemId === input.designSystem.artifact.id
      ? []
      : [
          {
            code: "design_system_mismatch" as const,
            stage: "layout_ir" as const,
            artifactId: input.layoutIr.provenance.artifactId,
            message: "Layout IR designSystemId must match the live Design System artifact id.",
          },
        ]),
    ...(input.layoutIr.artifact.slides.length === input.expectedSlideCount
      ? []
      : [
          {
            code: "slide_count_mismatch" as const,
            stage: "layout_ir" as const,
            artifactId: input.layoutIr.provenance.artifactId,
            message: `Layout IR must contain exactly ${input.expectedSlideCount} slides.`,
          },
        ]),
  ];
}

function artifactContextIssues(
  input: LiveTextPipelineCutoverInput,
): readonly LiveTextPipelineIssue[] {
  return [
    contextIssue(input.deckPlan.deckContextId, input.deckContextId, "deck_plan"),
    contextIssue(input.designSystem.deckContextId, input.deckContextId, "design_system"),
    contextIssue(input.layoutIr.deckContextId, input.deckContextId, "layout_ir"),
  ].filter((issue): issue is LiveTextPipelineIssue => issue !== undefined);
}

function slideContextIssues(input: LiveTextPipelineCutoverInput): readonly LiveTextPipelineIssue[] {
  const slideNumbers = new Set(input.deckPlan.artifact.slides.map((slide) => slide.number));
  return [
    ...(input.slideContextRefs.length === input.expectedSlideCount
      ? []
      : [
          {
            code: "slide_count_mismatch" as const,
            message: `Expected ${input.expectedSlideCount} slide context references.`,
          },
        ]),
    ...input.slideContextRefs.flatMap((ref) => [
      ...(slideNumbers.has(ref.slideNumber)
        ? []
        : [
            {
              code: "slide_count_mismatch" as const,
              slideNumber: ref.slideNumber,
              message: `Slide context reference ${ref.slideNumber} is not in the Deck Plan.`,
            },
          ]),
      ...(ref.deckContextId === input.deckContextId
        ? []
        : [
            {
              code: "deck_context_mismatch" as const,
              slideNumber: ref.slideNumber,
              message: "Every slide context reference must share the same deckContextId.",
            },
          ]),
      ...(ref.designSystemId === input.designSystem.artifact.id
        ? []
        : [
            {
              code: "design_system_mismatch" as const,
              slideNumber: ref.slideNumber,
              message: "Every slide context reference must share the same designSystemId.",
            },
          ]),
    ]),
  ];
}

function contextIssue(
  actual: string,
  expected: string,
  stage: LiveTextPipelineStage,
): LiveTextPipelineIssue | undefined {
  if (actual === expected) return undefined;
  return {
    code: "deck_context_mismatch",
    stage,
    message: "Every text pipeline artifact must share the same deckContextId.",
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

function providerIssue(
  stage: LiveTextPipelineStage,
  issue: ProviderProvenanceIssue,
): LiveTextPipelineIssue {
  return {
    code: issue.code,
    message: issue.message,
    stage,
    ...(issue.artifactId === undefined ? {} : { artifactId: issue.artifactId }),
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
