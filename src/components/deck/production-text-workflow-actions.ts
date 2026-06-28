import { updateProject } from "@/lib/deck-store";
import type { DeckProject, StepKey } from "@/lib/deck-types";
import {
  createLiveInterviewQuestionArtifactPatch,
  runDesktopLiveInterviewProductionWorkflow,
} from "@/lib/desktop-live-interview-workflow";
import { runDesktopLiveTextPipelineProductionWorkflow } from "@/lib/desktop-live-text-pipeline-workflow";
import type { CodexWorkflowRunStatus } from "@/lib/codex-live-status";
import type { InterviewQuestionField } from "@/lib/interview-questions";
import type { LiveInterviewAnswerMap } from "@/lib/live-interview-cutover";
import type { LiveTextArtifactRecord } from "@/lib/live-text-artifact-record";
import type { ProviderJobManager } from "@/lib/provider-job-manager";
import {
  ensureCodexReady,
  finishIfCancelled,
  handleThrownCodexError,
  setFailed,
} from "./production-text-workflow-preflight";

export type InterviewFollowUp = {
  readonly requiredFields: readonly InterviewQuestionField[];
  readonly questions: readonly string[];
};

export type ProductionTextWorkflowActionInput = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly setRunStatus: (status: CodexWorkflowRunStatus) => void;
  readonly isCancelled: () => boolean;
};

export type ProductionInterviewActionInput = ProductionTextWorkflowActionInput & {
  readonly answers: LiveInterviewAnswerMap;
  readonly setInterviewFollowUp: (followUp: InterviewFollowUp | null) => void;
};

const INTERVIEW_STEPS = ["로그인 확인", "app-server smoke", "인터뷰 질문", "브리프 생성"];
const TEXT_PIPELINE_STEPS = [
  "로그인 확인",
  "app-server smoke",
  "슬라이드 기획",
  "디자인 시스템",
  "레이아웃 구조",
];

export async function runInterviewQuestionsAction(
  input: ProductionInterviewActionInput,
): Promise<void> {
  if (!(await ensureCodexReady({ ...input, expectedSteps: INTERVIEW_STEPS }))) return;
  input.setRunStatus({
    kind: "running",
    message: "라이브 인터뷰 질문을 생성하는 중입니다.",
    currentStep: "인터뷰 질문",
    expectedSteps: INTERVIEW_STEPS,
    cancelRequested: false,
  });

  try {
    const result = await runDesktopLiveInterviewProductionWorkflow({
      project: input.project,
      jobManager: input.jobManager,
      answers: input.answers,
      createdAt: Date.now(),
    });
    if (finishIfCancelled(input)) return;
    switch (result.kind) {
      case "follow_up_required":
        updateProject(input.project.id, (latest) =>
          createLiveInterviewQuestionArtifactPatch(latest, result.questionArtifact.record),
        );
        input.setInterviewFollowUp({
          requiredFields: result.requiredFields,
          questions: result.questions,
        });
        input.setRunStatus({
          kind: "succeeded",
          message: "인터뷰 질문이 준비되었습니다. 아래 답변을 입력한 뒤 다시 실행하세요.",
          currentStep: "인터뷰 질문",
          expectedSteps: INTERVIEW_STEPS,
        });
        return;
      case "ready":
        input.setInterviewFollowUp(null);
        updateProject(input.project.id, (latest) => ({
          ...result.patch,
          liveTextArtifacts: mergeLiveTextArtifactRecords(
            latest.liveTextArtifacts,
            result.artifacts.map((artifact) => artifact.record),
          ),
        }));
        input.setRunStatus({
          kind: "succeeded",
          message: "라이브 인터뷰 브리프가 준비되었습니다.",
          currentStep: "브리프 생성",
          expectedSteps: INTERVIEW_STEPS,
        });
        return;
      case "blocked":
        setFailed(input, "workflow_blocked", result.issues.map((issue) => issue.message).join(" "));
        return;
      case "job_failed":
        setFailed(input, "job_failed", result.message);
        return;
      default:
        return assertNever(result);
    }
  } catch (error) {
    handleThrownCodexError(input, error);
  }
}

export async function runTextPipelineAction(
  input: ProductionTextWorkflowActionInput,
): Promise<void> {
  if (!(await ensureCodexReady({ ...input, expectedSteps: TEXT_PIPELINE_STEPS }))) return;
  input.setRunStatus({
    kind: "running",
    message: "라이브 텍스트 산출물을 생성하는 중입니다.",
    currentStep: "슬라이드 기획",
    expectedSteps: TEXT_PIPELINE_STEPS,
    cancelRequested: false,
  });

  try {
    const result = await runDesktopLiveTextPipelineProductionWorkflow({
      project: input.project,
      jobManager: input.jobManager,
      createdAt: Date.now(),
    });
    if (finishIfCancelled(input)) return;
    switch (result.kind) {
      case "ready":
        updateProject(input.project.id, (latest) => ({
          ...result.patch,
          liveTextArtifacts: mergeLiveTextArtifactRecords(
            latest.liveTextArtifacts,
            result.artifacts.map((artifact) => artifact.record),
          ),
        }));
        input.setRunStatus({
          kind: "succeeded",
          message: "라이브 텍스트 산출물이 준비되었습니다.",
          currentStep: "레이아웃 구조",
          expectedSteps: TEXT_PIPELINE_STEPS,
        });
        return;
      case "repair_required":
        setFailed(
          input,
          "schema_repair_required",
          `${result.stage} 산출물 스키마 보정이 필요합니다.`,
        );
        return;
      case "blocked":
      case "launch_blocked":
        setFailed(input, "workflow_blocked", result.issues.map((issue) => issue.message).join(" "));
        return;
      case "job_failed":
        setFailed(input, "job_failed", result.message);
        return;
      default:
        return assertNever(result);
    }
  } catch (error) {
    handleThrownCodexError(input, error);
  }
}

export function canRunTextPipeline(step: StepKey): boolean {
  return step === "plan" || step === "design" || step === "layout";
}

function mergeLiveTextArtifactRecords(
  existing: readonly LiveTextArtifactRecord[] | undefined,
  next: readonly LiveTextArtifactRecord[],
): readonly LiveTextArtifactRecord[] {
  const records = new Map<string, LiveTextArtifactRecord>();
  for (const record of existing ?? []) records.set(artifactRecordKey(record), record);
  for (const record of next) records.set(artifactRecordKey(record), record);
  return [...records.values()];
}

function artifactRecordKey(record: LiveTextArtifactRecord): string {
  return `${record.artifactType}:${record.artifactId}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled production text workflow value: ${JSON.stringify(value)}`);
}
