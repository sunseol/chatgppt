import type { DeckProject } from "./deck-types";
import {
  runDesktopProductionCodexAppServerJob,
  type DesktopProductionCodexAppServerJobInput,
} from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import { interviewBriefJob, interviewQuestionPlanJob } from "./desktop-live-interview-jobs";
import {
  createLiveInterviewPersistence,
  type LiveInterviewPersistenceResult,
} from "./live-text-artifact-persistence";
import type { LiveInterviewAnswerMap } from "./live-interview-cutover";
import type { InterviewQuestionPlan } from "./interview-questions";
import type { LiveTextArtifactRecord } from "./live-text-artifact-record";
import type { LiveTextProductionJobFailure } from "./live-text-production-workflow";
import type { ProviderJobManager } from "./provider-job-manager";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";

export type DesktopLiveInterviewWorkflowInput = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
  readonly answers: LiveInterviewAnswerMap;
  readonly createdAt: number;
  readonly version?: number;
};

export type LiveInterviewQuestionArtifactPatch = {
  readonly stage: "INTERVIEWING";
  readonly liveTextArtifacts: readonly LiveTextArtifactRecord[];
};

export type DesktopLiveInterviewWorkflowResult =
  | LiveInterviewPersistenceResult
  | LiveTextProductionJobFailure;

export async function runDesktopLiveInterviewProductionWorkflow(
  input: DesktopLiveInterviewWorkflowInput,
): Promise<DesktopLiveInterviewWorkflowResult> {
  const questionPlan = await runDesktopInterviewStageJob(
    "questions",
    interviewQuestionPlanJob(input),
  );
  if (questionPlan.kind === "job_failed") return questionPlan;

  const missingFields = missingAnswerFields(questionPlan.accepted.value, input.answers);
  if (missingFields.length > 0 || questionPlan.accepted.value.openQuestions.length > 0) {
    return createLiveInterviewPersistence({
      projectId: input.project.id,
      createdAt: input.createdAt,
      ...(input.version === undefined ? {} : { version: input.version }),
      questionPlan: questionPlan.accepted,
      answers: input.answers,
    });
  }

  const brief = await runDesktopInterviewStageJob(
    "brief",
    interviewBriefJob({
      context: input,
      questionArtifactId: questionPlan.accepted.provenance.artifactId,
      answers: input.answers,
    }),
  );
  if (brief.kind === "job_failed") return brief;

  return createLiveInterviewPersistence({
    projectId: input.project.id,
    createdAt: input.createdAt,
    ...(input.version === undefined ? {} : { version: input.version }),
    questionPlan: questionPlan.accepted,
    answers: input.answers,
    brief: brief.accepted,
  });
}

export function createLiveInterviewQuestionArtifactPatch(
  project: DeckProject,
  record: LiveTextArtifactRecord,
): LiveInterviewQuestionArtifactPatch {
  return {
    stage: "INTERVIEWING",
    liveTextArtifacts: [...(project.liveTextArtifacts ?? []), record],
  };
}

type DesktopInterviewStageResult<TValue> =
  | { readonly kind: "accepted"; readonly accepted: StructuredCodexAccepted<TValue> }
  | LiveTextProductionJobFailure;

async function runDesktopInterviewStageJob<TValue>(
  stage: LiveTextProductionJobFailure["stage"],
  spec: DesktopProductionCodexAppServerJobInput<TValue>,
): Promise<DesktopInterviewStageResult<TValue>> {
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

function missingAnswerFields(
  questionPlan: InterviewQuestionPlan,
  answers: LiveInterviewAnswerMap,
): readonly string[] {
  return questionPlan.questions
    .filter((question) => !answers[question.field]?.trim())
    .map((question) => question.field);
}
