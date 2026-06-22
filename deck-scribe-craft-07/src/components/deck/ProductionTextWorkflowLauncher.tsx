import { useMemo, useState } from "react";
import { QuestionAnswerPanel } from "./InterviewPanels";
import {
  ProductionTextWorkflowPanel,
  type ProductionTextWorkflowRunStatus,
} from "./ProductionTextWorkflowPanel";
import { createQuestionPlan, type InterviewAnswerMap } from "./interview-stage-model";
import { updateProject } from "@/lib/deck-store";
import type { DeckProject, StepKey } from "@/lib/deck-types";
import {
  createLiveInterviewQuestionArtifactPatch,
  createLiveInterviewReadyArtifactPatch,
  runDesktopLiveInterviewProductionWorkflow,
} from "@/lib/desktop-live-interview-workflow";
import {
  createLiveTextPipelineReadyArtifactPatch,
  runDesktopLiveTextPipelineProductionWorkflow,
} from "@/lib/desktop-live-text-pipeline-workflow";
import {
  createInterviewQuestion,
  type InterviewQuestionField,
  type InterviewQuestionPlan,
} from "@/lib/interview-questions";
import { createLiveInterviewAnswerMap } from "@/lib/live-interview-answer-map";
import { createProviderJobManager } from "@/lib/provider-job-manager";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export type ProductionTextWorkflowLauncherProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
};

const PRODUCTION_INTERVIEW_FIELDS = [
  "goal",
  "audience",
  "desiredOutcome",
  "coreMessage",
  "slideCount",
  "aspectRatio",
  "language",
  "tone",
  "mustInclude",
  "mustAvoid",
  "successCriteria",
] as const satisfies readonly InterviewQuestionField[];

export function ProductionTextWorkflowLauncher({
  project,
  step,
  appServerBridge,
}: ProductionTextWorkflowLauncherProps) {
  const [runStatus, setRunStatus] = useState<ProductionTextWorkflowRunStatus>({ kind: "idle" });
  const [answers, setAnswers] = useState<InterviewAnswerMap>(() =>
    createProductionInitialAnswers(project),
  );
  const questionPlan = useMemo(() => createProductionQuestionPlan(project), [project]);
  const [manager] = useState(() =>
    createProviderJobManager({ createId: () => `${project.id}_text_${Date.now().toString(36)}` }),
  );
  const onRun =
    step === "interview"
      ? () => {
          void runInterviewQuestions(project, answers, manager, setRunStatus);
        }
      : canRunTextPipeline(step)
        ? () => {
            void runTextPipeline(project, manager, setRunStatus);
          }
        : undefined;

  return (
    <>
      {step === "interview" && project.brief === undefined ? (
        <div className="mt-6">
          <QuestionAnswerPanel plan={questionPlan} answers={answers} onAnswers={setAnswers} />
        </div>
      ) : null}
      <ProductionTextWorkflowPanel
        project={project}
        step={step}
        appServerBridge={appServerBridge}
        runStatus={runStatus}
        onRun={onRun}
      />
    </>
  );
}

async function runInterviewQuestions(
  project: DeckProject,
  answers: InterviewAnswerMap,
  jobManager: ReturnType<typeof createProviderJobManager>,
  setRunStatus: (status: ProductionTextWorkflowRunStatus) => void,
): Promise<void> {
  setRunStatus({ kind: "running", message: "Running live interview question turn." });
  try {
    const result = await runDesktopLiveInterviewProductionWorkflow({
      project,
      jobManager,
      answers,
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
        updateProject(
          project.id,
          createLiveTextPipelineReadyArtifactPatch(
            project,
            result.patch,
            result.artifacts.map((artifact) => artifact.record),
          ),
        );
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

function createProductionQuestionPlan(project: DeckProject): InterviewQuestionPlan {
  const plan = createQuestionPlan(project);
  return {
    ...plan,
    questions: PRODUCTION_INTERVIEW_FIELDS.map((field) => findInterviewQuestion(plan, field)),
  };
}

function findInterviewQuestion(plan: InterviewQuestionPlan, field: InterviewQuestionField) {
  return (
    plan.questions.find((question) => question.field === field) ?? createInterviewQuestion(field)
  );
}

function createProductionInitialAnswers(project: DeckProject): InterviewAnswerMap {
  const existing = createLiveInterviewAnswerMap(project);
  if (project.brief !== undefined) return existing;

  return {
    ...existing,
    coreMessage: project.initialPrompt,
    slideCount: project.slideCount.toString(),
    aspectRatio: project.aspectRatio,
    language: project.language,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled production text workflow result: ${JSON.stringify(value)}`);
}
