import { useState } from "react";
import {
  ProductionTextWorkflowPanel,
  type ProductionTextWorkflowRunStatus,
} from "./ProductionTextWorkflowPanel";
import { updateProject } from "@/lib/deck-store";
import type { DeckProject, StepKey } from "@/lib/deck-types";
import {
  createLiveInterviewQuestionArtifactPatch,
  createLiveInterviewReadyArtifactPatch,
  runDesktopLiveInterviewProductionWorkflow,
} from "@/lib/desktop-live-interview-workflow";
import { runDesktopLiveTextPipelineProductionWorkflow } from "@/lib/desktop-live-text-pipeline-workflow";
import { createLiveInterviewAnswerMap } from "@/lib/live-interview-answer-map";
import { createProviderJobManager } from "@/lib/provider-job-manager";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export type ProductionTextWorkflowLauncherProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
};

export function ProductionTextWorkflowLauncher({
  project,
  step,
  appServerBridge,
}: ProductionTextWorkflowLauncherProps) {
  const [runStatus, setRunStatus] = useState<ProductionTextWorkflowRunStatus>({ kind: "idle" });
  const [manager] = useState(() =>
    createProviderJobManager({ createId: () => `${project.id}_text_${Date.now().toString(36)}` }),
  );
  const onRun =
    step === "interview"
      ? () => {
          void runInterviewQuestions(project, manager, setRunStatus);
        }
      : canRunTextPipeline(step)
        ? () => {
            void runTextPipeline(project, manager, setRunStatus);
          }
        : undefined;

  return (
    <ProductionTextWorkflowPanel
      project={project}
      step={step}
      appServerBridge={appServerBridge}
      runStatus={runStatus}
      onRun={onRun}
    />
  );
}

async function runInterviewQuestions(
  project: DeckProject,
  jobManager: ReturnType<typeof createProviderJobManager>,
  setRunStatus: (status: ProductionTextWorkflowRunStatus) => void,
): Promise<void> {
  setRunStatus({ kind: "running", message: "Running live interview question turn." });
  try {
    const result = await runDesktopLiveInterviewProductionWorkflow({
      project,
      jobManager,
      answers: createLiveInterviewAnswerMap(project),
      createdAt: Date.now(),
    });
    switch (result.kind) {
      case "follow_up_required":
        updateProject(
          project.id,
          createLiveInterviewQuestionArtifactPatch(project, result.questionArtifact.record),
        );
        setRunStatus({
          kind: "succeeded",
          message: `Live interview questions are ready: ${result.questions.join(" ")}`,
        });
        return;
      case "ready":
        updateProject(
          project.id,
          createLiveInterviewReadyArtifactPatch(
            project,
            result.patch,
            result.artifacts.map((artifact) => artifact.record),
          ),
        );
        setRunStatus({ kind: "succeeded", message: "Live interview brief is ready." });
        return;
      case "blocked":
        setRunStatus({
          kind: "failed",
          message: result.issues.map((issue) => issue.message).join(" "),
        });
        return;
      case "job_failed":
        setRunStatus({ kind: "failed", message: result.message });
        return;
      default:
        return assertNever(result);
    }
  } catch (error) {
    if (error instanceof Error) {
      setRunStatus({ kind: "failed", message: error.message });
      return;
    }
    throw error;
  }
}

async function runTextPipeline(
  project: DeckProject,
  jobManager: ReturnType<typeof createProviderJobManager>,
  setRunStatus: (status: ProductionTextWorkflowRunStatus) => void,
): Promise<void> {
  setRunStatus({ kind: "running", message: "Running live App Server text turns." });
  try {
    const result = await runDesktopLiveTextPipelineProductionWorkflow({
      project,
      jobManager,
      createdAt: Date.now(),
    });
    switch (result.kind) {
      case "ready":
        updateProject(project.id, result.patch);
        setRunStatus({ kind: "succeeded", message: "Live text pipeline artifacts are ready." });
        return;
      case "repair_required":
        setRunStatus({ kind: "failed", message: `Schema repair required for ${result.stage}.` });
        return;
      case "blocked":
        setRunStatus({
          kind: "failed",
          message: result.issues.map((issue) => issue.message).join(" "),
        });
        return;
      case "launch_blocked":
        setRunStatus({
          kind: "failed",
          message: result.issues.map((issue) => issue.message).join(" "),
        });
        return;
      case "job_failed":
        setRunStatus({ kind: "failed", message: result.message });
        return;
      default:
        return assertNever(result);
    }
  } catch (error) {
    if (error instanceof Error) {
      setRunStatus({ kind: "failed", message: error.message });
      return;
    }
    throw error;
  }
}

function canRunTextPipeline(step: StepKey): boolean {
  return step === "plan" || step === "design" || step === "layout";
}

function assertNever(value: never): never {
  throw new Error(`Unhandled production text workflow result: ${JSON.stringify(value)}`);
}
