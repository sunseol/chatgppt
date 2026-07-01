import { useRef, useState } from "react";
import {
  ProductionTextWorkflowPanel,
  type ProductionTextWorkflowRunStatus,
} from "./ProductionTextWorkflowPanel";
import { ProductionLiveInterviewAnswers } from "./ProductionLiveInterviewAnswers";
import {
  canRunTextPipeline,
  runInterviewQuestionsAction,
  runTextPipelineAction,
  type InterviewFollowUp,
} from "./production-text-workflow-actions";
import type { DeckProject, StepKey } from "@/lib/deck-types";
import type { LiveInterviewAnswerMap } from "@/lib/live-interview-cutover";
import { createProviderJobManager } from "@/lib/provider-job-manager";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export type ProductionTextWorkflowLauncherProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly runStatusOverride?: ProductionTextWorkflowRunStatus;
  readonly onRunStatusChange?: (status: ProductionTextWorkflowRunStatus) => void;
  readonly onOpenConnectionSettings?: () => void;
  readonly actionLabelOverride?: string;
  readonly disabledReason?: string;
};

export function ProductionTextWorkflowLauncher({
  project,
  step,
  appServerBridge,
  runStatusOverride,
  onRunStatusChange,
  onOpenConnectionSettings,
  actionLabelOverride,
  disabledReason,
}: ProductionTextWorkflowLauncherProps) {
  const [runStatus, setRunStatus] = useState<ProductionTextWorkflowRunStatus>({ kind: "idle" });
  const [interviewAnswers, setInterviewAnswers] = useState<LiveInterviewAnswerMap>({});
  const [interviewFollowUp, setInterviewFollowUp] = useState<InterviewFollowUp | null>(null);
  const cancelRequestedRef = useRef(false);
  const [manager] = useState(() =>
    createProviderJobManager({ createId: () => `${project.id}_text_${Date.now().toString(36)}` }),
  );
  const visibleRunStatus = runStatusOverride ?? runStatus;
  const missingAnswerCount =
    interviewFollowUp?.requiredFields.filter((field) => !interviewAnswers[field]?.trim()).length ??
    0;
  const isAnsweringInterview = step === "interview" && interviewFollowUp !== null;
  const answerPanelLabel = isAnsweringInterview ? "아래 답변 입력 영역 사용" : undefined;
  const answerDisabledReason =
    isAnsweringInterview && missingAnswerCount > 0
      ? `필수 답변 ${missingAnswerCount}개를 입력하면 브리프 생성 버튼이 활성화됩니다.`
      : undefined;
  const answerPanelDisabledReason = isAnsweringInterview
    ? "아래 Live interview answers 영역에서 답변을 제출하세요."
    : undefined;
  const publishRunStatus = (status: ProductionTextWorkflowRunStatus) => {
    setRunStatus(status);
    onRunStatusChange?.(status);
  };
  const onRun =
    step === "interview"
      ? () => {
          cancelRequestedRef.current = false;
          void runInterviewQuestionsAction({
            project,
            jobManager: manager,
            answers: interviewAnswers,
            setRunStatus: publishRunStatus,
            setInterviewFollowUp,
            isCancelled: () => cancelRequestedRef.current,
          });
        }
      : canRunTextPipeline(step)
        ? () => {
            cancelRequestedRef.current = false;
            void runTextPipelineAction({
              project,
              jobManager: manager,
              setRunStatus: publishRunStatus,
              isCancelled: () => cancelRequestedRef.current,
            });
          }
        : undefined;
  const onCancel = () => {
    cancelRequestedRef.current = true;
    setRunStatus((status) => {
      if (status.kind !== "running") return status;
      const next = { ...status, cancelRequested: true };
      onRunStatusChange?.(next);
      return next;
    });
  };

  return (
    <>
      <ProductionTextWorkflowPanel
        project={project}
        step={step}
        appServerBridge={appServerBridge}
        runStatus={visibleRunStatus}
        onRun={onRun}
        onCancel={onCancel}
        onRetry={onRun}
        onOpenConnectionSettings={onOpenConnectionSettings}
        actionLabelOverride={actionLabelOverride ?? answerPanelLabel}
        disabledReason={disabledReason ?? answerDisabledReason ?? answerPanelDisabledReason}
      />
      {step === "interview" && interviewFollowUp ? (
        <ProductionLiveInterviewAnswers
          questions={interviewFollowUp.questions}
          requiredFields={interviewFollowUp.requiredFields}
          answers={interviewAnswers}
          onAnswers={setInterviewAnswers}
          onSubmitAnswers={onRun}
        />
      ) : null}
    </>
  );
}
