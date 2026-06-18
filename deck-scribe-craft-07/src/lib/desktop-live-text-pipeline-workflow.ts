import { hashContent } from "./artifacts";
import type { DeckProject } from "./deck-types";
import {
  runDesktopProductionCodexAppServerJob,
  type DesktopProductionCodexAppServerJobInput,
} from "./desktop-codex-app-server-production-job";
import { deckPlanJob, designSystemJob, layoutIrJob } from "./desktop-live-text-pipeline-jobs";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import { buildLayoutIrPrompt } from "./layout-ir-prompt";
import { createLiveTextPipelinePersistence } from "./live-text-artifact-persistence";
import type { LiveTextPipelinePersistenceResult } from "./live-text-artifact-persistence";
import type { LiveTextProductionJobFailure } from "./live-text-production-workflow";
import {
  createProductionTextWorkflowGate,
  type ProductionTextWorkflowIssue,
} from "./production-text-workflow-gate";
import type { ProviderJobManager } from "./provider-job-manager";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";

export type DesktopLiveTextPipelineWorkflowInput = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
  readonly createdAt: number;
  readonly version?: number;
};

export type DesktopLiveTextPipelineLaunchBlocked = {
  readonly kind: "launch_blocked";
  readonly issues: readonly ProductionTextWorkflowIssue[];
};

export type DesktopLiveTextPipelineWorkflowResult =
  | LiveTextPipelinePersistenceResult
  | LiveTextProductionJobFailure
  | DesktopLiveTextPipelineLaunchBlocked;

export async function runDesktopLiveTextPipelineProductionWorkflow(
  input: DesktopLiveTextPipelineWorkflowInput,
): Promise<DesktopLiveTextPipelineWorkflowResult> {
  const gate = createProductionTextWorkflowGate({
    project: input.project,
    step: "layout",
    appServerBridge: "available",
  });
  if (gate.kind !== "ready") {
    return { kind: "launch_blocked", issues: prerequisiteIssues(input.project) };
  }

  const brief = input.project.brief;
  const research = input.project.research;
  if (!brief?.approvedHash || !research?.approvedHash) {
    return { kind: "launch_blocked", issues: prerequisiteIssues(input.project) };
  }

  const deckContextId = textPipelineContextId(input.project);
  const deckPlan = await runDesktopStageJob("deck_plan", deckPlanJob(input));
  if (deckPlan.kind === "job_failed") return deckPlan;

  const designSystem = await runDesktopStageJob(
    "design_system",
    designSystemJob(input, deckContextId, deckPlan.accepted.value),
  );
  if (designSystem.kind === "job_failed") return designSystem;

  const layoutIrPrompt = buildLayoutIrPrompt({
    plan: deckPlan.accepted.value,
    design: designSystem.accepted.value,
  });
  if (layoutIrPrompt.kind === "blocked") {
    return {
      kind: "job_failed",
      stage: "layout_ir",
      job: failedPlaceholderJob("layout_ir", layoutIrPrompt.issues.join(" ")),
      message: layoutIrPrompt.issues.join(" "),
    };
  }

  const layoutIr = await runDesktopStageJob("layout_ir", layoutIrJob(input, layoutIrPrompt.prompt));
  if (layoutIr.kind === "job_failed") return layoutIr;

  return createLiveTextPipelinePersistence({
    projectId: input.project.id,
    createdAt: input.createdAt,
    ...(input.version === undefined ? {} : { version: input.version }),
    deckContextId,
    expectedSlideCount: input.project.slideCount,
    deckPlan: deckPlan.accepted,
    designSystem: designSystem.accepted,
    layoutIr: layoutIr.accepted,
    slideContextRefs: deckPlan.accepted.value.slides.map((slide) => ({
      slideNumber: slide.number,
      deckContextId,
      designSystemId: designSystem.accepted.value.id,
    })),
    repairAttempts: [],
  });
}

type DesktopStageResult<TValue> =
  | { readonly kind: "accepted"; readonly accepted: StructuredCodexAccepted<TValue> }
  | LiveTextProductionJobFailure;

async function runDesktopStageJob<TValue>(
  stage: LiveTextProductionJobFailure["stage"],
  spec: DesktopProductionCodexAppServerJobInput<TValue>,
): Promise<DesktopStageResult<TValue>> {
  const job = await runDesktopProductionCodexAppServerJob(spec);
  if (job.status === "succeeded" && job.output !== undefined) {
    return { kind: "accepted", accepted: job.output };
  }
  return {
    kind: "job_failed",
    stage,
    job,
    message: job.errorMessage ?? `Desktop Codex App Server job did not accept ${stage}.`,
  };
}

function prerequisiteIssues(project: DeckProject): readonly ProductionTextWorkflowIssue[] {
  const gate = createProductionTextWorkflowGate({
    project,
    step: "layout",
    appServerBridge: "available",
  });
  return gate.kind === "blocked" ? gate.issues : [];
}

function textPipelineContextId(project: DeckProject): string {
  return `deckctx_${hashContent(`${project.id}|${project.brief?.approvedHash ?? ""}|${project.research?.approvedHash ?? ""}`).slice(7, 19)}`;
}

function failedPlaceholderJob(stage: LiveTextProductionJobFailure["stage"], message: string) {
  return {
    id: `blocked_${stage}`,
    providerId: "codex",
    capability: "layoutPrototype" as const,
    description: message,
    status: "failed" as const,
    createdAt: Date.now(),
    attempt: 1,
    cancelRequested: false,
    errorMessage: message,
  };
}
