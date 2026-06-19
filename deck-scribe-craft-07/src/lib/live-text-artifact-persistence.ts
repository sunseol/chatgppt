import type { DeckPlan, DeckProject, DesignSystem, InterviewBrief } from "./deck-types";
import type { InterviewQuestionPlan } from "./interview-questions";
import { renderLayoutIrToPrototype, type LayoutIR } from "./layout-ir";
import {
  createPersistedLiveTextArtifact,
  type LiveTextPersistedArtifact,
} from "./live-text-artifact-record";
import {
  interviewTurnArtifact,
  optionalInterviewTurnArtifact,
  textTurnArtifact,
} from "./live-text-turn-artifacts";
import {
  createLiveInterviewProviderFailureRecovery,
  evaluateLiveInterviewCutover,
  type LiveInterviewAnswerMap,
  type LiveInterviewCutoverResult,
  type LiveInterviewIssue,
  type LiveInterviewRecovery,
} from "./live-interview-cutover";
import {
  evaluateLiveTextPipelineCutover,
  type LiveTextPipelineCutoverInput,
  type LiveTextPipelineCutoverResult,
  type LiveTextPipelineIssue,
  type LiveTextPipelineRecovery,
} from "./live-text-pipeline-cutover";
import type { ProviderArtifactProvenance } from "./provider-provenance";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";
import type { LiveTextPipelineReadyPatch } from "./live-text-pipeline-persistence-types";

export type LiveInterviewPersistenceInput = {
  readonly projectId: string;
  readonly createdAt: number;
  readonly version?: number;
  readonly questionInputArtifactId: string;
  readonly questionPlan: StructuredCodexAccepted<InterviewQuestionPlan>;
  readonly answers: LiveInterviewAnswerMap;
  readonly brief?: StructuredCodexAccepted<InterviewBrief>;
};

export type LiveInterviewReadyPatch = Readonly<
  Pick<DeckProject, "stage"> & { readonly brief: InterviewBrief }
>;

export type LiveInterviewPersistenceResult =
  | {
      readonly kind: "ready";
      readonly patch: LiveInterviewReadyPatch;
      readonly artifacts: readonly LiveTextPersistedArtifact<
        InterviewQuestionPlan | InterviewBrief
      >[];
      readonly provenanceLineage: readonly ProviderArtifactProvenance[];
    }
  | {
      readonly kind: "follow_up_required";
      readonly requiredFields: Extract<
        LiveInterviewCutoverResult,
        { readonly kind: "follow_up_required" }
      >["requiredFields"];
      readonly questions: readonly string[];
      readonly nextTurn: Extract<
        LiveInterviewCutoverResult,
        { readonly kind: "follow_up_required" }
      >["nextTurn"];
      readonly questionArtifact: LiveTextPersistedArtifact<InterviewQuestionPlan>;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveInterviewIssue[];
      readonly recovery: LiveInterviewRecovery;
    };

export type LiveTextPipelinePersistenceInput = {
  readonly projectId: string;
  readonly createdAt: number;
  readonly version?: number;
  readonly approvedBriefArtifactId: string;
  readonly approvedResearchPackArtifactId: string;
  readonly deckContextId: string;
  readonly expectedSlideCount: number;
  readonly deckPlan: StructuredCodexAccepted<DeckPlan>;
  readonly designSystem: StructuredCodexAccepted<DesignSystem>;
  readonly layoutIr: StructuredCodexAccepted<LayoutIR>;
  readonly slideContextRefs: LiveTextPipelineCutoverInput["slideContextRefs"];
  readonly repairAttempts: LiveTextPipelineCutoverInput["repairAttempts"];
};

export type LiveTextPipelinePersistenceResult =
  | {
      readonly kind: "ready";
      readonly deckContextId: string;
      readonly designSystemId: string;
      readonly slideCount: number;
      readonly patch: LiveTextPipelineReadyPatch;
      readonly artifacts: readonly LiveTextPersistedArtifact<DeckPlan | DesignSystem | LayoutIR>[];
      readonly provenanceLineage: readonly ProviderArtifactProvenance[];
    }
  | {
      readonly kind: "repair_required";
      readonly stage: Extract<
        LiveTextPipelineCutoverResult,
        { readonly kind: "repair_required" }
      >["stage"];
      readonly issues: readonly LiveTextPipelineIssue[];
      readonly nextTurn: Extract<
        LiveTextPipelineCutoverResult,
        { readonly kind: "repair_required" }
      >["nextTurn"];
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveTextPipelineIssue[];
      readonly recovery: LiveTextPipelineRecovery;
    };

export function createLiveInterviewPersistence(
  input: LiveInterviewPersistenceInput,
): LiveInterviewPersistenceResult {
  const questionTurn = interviewTurnArtifact(input.questionPlan);
  const briefTurn = optionalInterviewTurnArtifact(input.brief);
  const cutover = evaluateLiveInterviewCutover({
    questionInputArtifactId: input.questionInputArtifactId,
    questionPlan: questionTurn,
    answers: input.answers,
    ...(briefTurn === undefined ? {} : { brief: briefTurn }),
  });
  const questionArtifact = createPersistedLiveTextArtifact({
    projectId: input.projectId,
    artifactType: "interview_questions",
    artifact: input.questionPlan.value,
    provenance: input.questionPlan.provenance,
    createdAt: input.createdAt,
    version: input.version ?? 1,
  });

  switch (cutover.kind) {
    case "follow_up_required":
      return { ...cutover, questionArtifact };
    case "blocked":
      return cutover;
    case "ready":
      return readyInterviewPersistence(input, questionArtifact, cutover);
    default:
      return assertNever(cutover);
  }
}

export function createLiveTextPipelinePersistence(
  input: LiveTextPipelinePersistenceInput,
): LiveTextPipelinePersistenceResult {
  const cutover = evaluateLiveTextPipelineCutover({
    approvedBriefArtifactId: input.approvedBriefArtifactId,
    approvedResearchPackArtifactId: input.approvedResearchPackArtifactId,
    deckContextId: input.deckContextId,
    expectedSlideCount: input.expectedSlideCount,
    deckPlan: textTurnArtifact(input.deckPlan, input.deckContextId),
    designSystem: textTurnArtifact(input.designSystem, input.deckContextId),
    layoutIr: textTurnArtifact(input.layoutIr, input.deckContextId),
    slideContextRefs: input.slideContextRefs,
    repairAttempts: input.repairAttempts,
  });

  switch (cutover.kind) {
    case "repair_required":
      return cutover;
    case "blocked":
      return cutover;
    case "ready":
      return {
        kind: "ready",
        deckContextId: cutover.deckContextId,
        designSystemId: cutover.designSystemId,
        slideCount: cutover.slideCount,
        patch: {
          plan: input.deckPlan.value,
          design: input.designSystem.value,
          layout: renderLayoutIrToPrototype(input.layoutIr.value),
          stage: "LAYOUT_APPROVAL_PENDING",
        },
        artifacts: [
          createPersistedLiveTextArtifact({
            projectId: input.projectId,
            artifactType: "deck_plan",
            artifact: input.deckPlan.value,
            provenance: input.deckPlan.provenance,
            createdAt: input.createdAt,
            version: input.version ?? 1,
          }),
          createPersistedLiveTextArtifact({
            projectId: input.projectId,
            artifactType: "design_system",
            artifact: input.designSystem.value,
            provenance: input.designSystem.provenance,
            createdAt: input.createdAt,
            version: input.version ?? 1,
          }),
          createPersistedLiveTextArtifact({
            projectId: input.projectId,
            artifactType: "layout_ir",
            artifact: input.layoutIr.value,
            provenance: input.layoutIr.provenance,
            createdAt: input.createdAt,
            version: input.version ?? 1,
          }),
        ],
        provenanceLineage: cutover.provenanceLineage,
      };
    default:
      return assertNever(cutover);
  }
}

function readyInterviewPersistence(
  input: LiveInterviewPersistenceInput,
  questionArtifact: LiveTextPersistedArtifact<InterviewQuestionPlan>,
  cutover: Extract<LiveInterviewCutoverResult, { readonly kind: "ready" }>,
): LiveInterviewPersistenceResult {
  if (input.brief === undefined) {
    return {
      kind: "blocked",
      issues: [
        {
          code: "missing_brief_artifact",
          stage: "brief",
          message: "Live interview persistence requires a Codex-generated brief artifact.",
        },
      ],
      recovery: createLiveInterviewProviderFailureRecovery({
        stage: "brief",
        message: "Live interview persistence requires a Codex-generated brief artifact.",
      }),
    };
  }

  const briefArtifact = createPersistedLiveTextArtifact({
    projectId: input.projectId,
    artifactType: "interview_brief",
    artifact: input.brief.value,
    provenance: input.brief.provenance,
    createdAt: input.createdAt,
    version: input.version ?? 1,
  });

  return {
    kind: "ready",
    patch: { brief: input.brief.value, stage: "INTERVIEW_APPROVAL_PENDING" },
    artifacts: [questionArtifact, briefArtifact],
    provenanceLineage: cutover.provenanceLineage,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected live text persistence variant: ${String(value)}`);
}
