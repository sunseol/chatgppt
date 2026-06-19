import {
  runProductionCodexAppServerJob,
  type ProductionCodexAppServerJobInput,
} from "./codex-app-server-production-job";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";
import type { DeckPlan, DesignSystem, InterviewBrief } from "./deck-types";
import type { InterviewQuestionPlan } from "./interview-questions";
import type { LayoutIR } from "./layout-ir";
import {
  createLiveInterviewPersistence,
  createLiveTextPipelinePersistence,
  type LiveInterviewPersistenceResult,
  type LiveTextPipelinePersistenceResult,
} from "./live-text-artifact-persistence";
import type { LiveInterviewAnswerMap } from "./live-interview-cutover";
import type { LiveTextPipelineCutoverInput } from "./live-text-pipeline-cutover";
import type { ProviderJob, ProviderJobManager } from "./provider-job-manager";

export type LiveTextProductionJobSpec<TValue> = Omit<
  ProductionCodexAppServerJobInput<TValue>,
  "jobManager"
>;

export type LiveTextProductionStage =
  | "questions"
  | "brief"
  | "deck_plan"
  | "design_system"
  | "layout_ir";

export type LiveTextProductionJobFailure = {
  readonly kind: "job_failed";
  readonly stage: LiveTextProductionStage;
  readonly job: ProviderJob<StructuredCodexAccepted<unknown>>;
  readonly message: string;
};

export type LiveTextPipelineProductionWorkflowInput = {
  readonly projectId: string;
  readonly createdAt: number;
  readonly version?: number;
  readonly jobManager: ProviderJobManager;
  readonly approvedBriefArtifactId: string;
  readonly approvedResearchPackArtifactId: string;
  readonly deckContextId: string;
  readonly expectedSlideCount: number;
  readonly deckPlanJob: LiveTextProductionJobSpec<DeckPlan>;
  readonly designSystemJob: LiveTextProductionJobSpec<DesignSystem>;
  readonly layoutIrJob: LiveTextProductionJobSpec<LayoutIR>;
  readonly slideContextRefs: LiveTextPipelineCutoverInput["slideContextRefs"];
  readonly repairAttempts: LiveTextPipelineCutoverInput["repairAttempts"];
};

export type LiveInterviewProductionWorkflowInput = {
  readonly projectId: string;
  readonly createdAt: number;
  readonly version?: number;
  readonly jobManager: ProviderJobManager;
  readonly questionInputArtifactId: string;
  readonly questionPlanJob: LiveTextProductionJobSpec<InterviewQuestionPlan>;
  readonly answers: LiveInterviewAnswerMap;
  readonly briefJob?: LiveTextProductionJobSpec<InterviewBrief>;
};

export type LiveTextPipelineProductionWorkflowResult =
  | LiveTextPipelinePersistenceResult
  | LiveTextProductionJobFailure;

export type LiveInterviewProductionWorkflowResult =
  | LiveInterviewPersistenceResult
  | LiveTextProductionJobFailure;

export async function runLiveInterviewProductionWorkflow(
  input: LiveInterviewProductionWorkflowInput,
): Promise<LiveInterviewProductionWorkflowResult> {
  const questionPlan = await runStageJob("questions", input.jobManager, input.questionPlanJob);
  if (questionPlan.kind === "job_failed") return questionPlan;

  const brief = input.briefJob
    ? await runStageJob("brief", input.jobManager, input.briefJob)
    : undefined;
  if (brief?.kind === "job_failed") return brief;

  return createLiveInterviewPersistence({
    projectId: input.projectId,
    createdAt: input.createdAt,
    ...(input.version === undefined ? {} : { version: input.version }),
    questionInputArtifactId: input.questionInputArtifactId,
    questionPlan: questionPlan.accepted,
    answers: input.answers,
    ...(brief === undefined ? {} : { brief: brief.accepted }),
  });
}

export async function runLiveTextPipelineProductionWorkflow(
  input: LiveTextPipelineProductionWorkflowInput,
): Promise<LiveTextPipelineProductionWorkflowResult> {
  const deckPlan = await runStageJob("deck_plan", input.jobManager, input.deckPlanJob);
  if (deckPlan.kind === "job_failed") return deckPlan;

  const designSystem = await runStageJob("design_system", input.jobManager, input.designSystemJob);
  if (designSystem.kind === "job_failed") return designSystem;

  const layoutIr = await runStageJob("layout_ir", input.jobManager, input.layoutIrJob);
  if (layoutIr.kind === "job_failed") return layoutIr;

  return createLiveTextPipelinePersistence({
    projectId: input.projectId,
    createdAt: input.createdAt,
    ...(input.version === undefined ? {} : { version: input.version }),
    approvedBriefArtifactId: input.approvedBriefArtifactId,
    approvedResearchPackArtifactId: input.approvedResearchPackArtifactId,
    deckContextId: input.deckContextId,
    expectedSlideCount: input.expectedSlideCount,
    deckPlan: deckPlan.accepted,
    designSystem: designSystem.accepted,
    layoutIr: layoutIr.accepted,
    slideContextRefs: input.slideContextRefs,
    repairAttempts: input.repairAttempts,
  });
}

type StageJobResult<TValue> =
  | { readonly kind: "accepted"; readonly accepted: StructuredCodexAccepted<TValue> }
  | LiveTextProductionJobFailure;

async function runStageJob<TValue>(
  stage: LiveTextProductionStage,
  jobManager: ProviderJobManager,
  spec: LiveTextProductionJobSpec<TValue>,
): Promise<StageJobResult<TValue>> {
  const job = await runProductionCodexAppServerJob({ ...spec, jobManager });
  if (job.status === "succeeded" && job.output !== undefined) {
    return { kind: "accepted", accepted: job.output };
  }

  return {
    kind: "job_failed",
    stage,
    job,
    message: job.errorMessage ?? `Production Codex App Server job did not accept ${stage}.`,
  };
}
