import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { createProductionTextWorkflowGate } from "@/lib/production-text-workflow-gate";
import type { WorkflowPrimaryActionSetter } from "./workflow-primary-action";

export type ProductionTextWorkflowLauncherProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly runStatusOverride?: ProductionTextWorkflowRunStatus;
  readonly onRunStatusChange?: (status: ProductionTextWorkflowRunStatus) => void;
  readonly onOpenConnectionSettings?: () => void;
  readonly codexLoginVerified?: boolean;
  readonly onRequireCodexConnection?: () => void;
  readonly actionLabelOverride?: string;
  readonly disabledReason?: string;
  readonly onPrimaryActionChange?: WorkflowPrimaryActionSetter;
  readonly suppressPrimaryAction?: boolean;
};

export function shouldRequestCodexConnectionBeforeRun(input: {
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly codexLoginVerified: boolean;
}): boolean {
  return input.appServerBridge !== "available" || !input.codexLoginVerified;
}

export function ProductionTextWorkflowLauncher({
  project,
  step,
  appServerBridge,
  runStatusOverride,
  onRunStatusChange,
  onOpenConnectionSettings,
  codexLoginVerified = true,
  onRequireCodexConnection,
  actionLabelOverride,
  disabledReason,
  onPrimaryActionChange,
  suppressPrimaryAction = false,
}: ProductionTextWorkflowLauncherProps) {
  const [runStatus, setRunStatus] = useState<ProductionTextWorkflowRunStatus>({ kind: "idle" });
  const [interviewAnswers, setInterviewAnswers] = useState<LiveInterviewAnswerMap>({});
  const [interviewFollowUp, setInterviewFollowUp] = useState<InterviewFollowUp | null>(null);
  const cancelRequestedRef = useRef(false);
  const [manager] = useState(() =>
    createProviderJobManager({ createId: () => `${project.id}_text_${Date.now().toString(36)}` }),
  );
  const visibleRunStatus = runStatusOverride ?? runStatus;
  const gate = useMemo(
    () => createProductionTextWorkflowGate({ project, step, appServerBridge }),
    [appServerBridge, project, step],
  );
  const isRunning = visibleRunStatus.kind === "running";
  const missingAnswerCount =
    interviewFollowUp?.requiredFields.filter((field) => !interviewAnswers[field]?.trim()).length ??
    0;
  const isAnsweringInterview = step === "interview" && interviewFollowUp !== null;
  const answerPanelLabel = isAnsweringInterview ? "답변 제출하고 브리프 생성" : undefined;
  const answerDisabledReason =
    isAnsweringInterview && missingAnswerCount > 0
      ? `필수 답변 ${missingAnswerCount}개를 입력하면 브리프 생성 버튼이 활성화됩니다.`
      : undefined;
  const answerPanelDisabledReason = isAnsweringInterview
    ? "아래 Live interview answers 영역에서 답변을 제출하세요."
    : undefined;
  const publishRunStatus = useCallback(
    (status: ProductionTextWorkflowRunStatus) => {
      setRunStatus(status);
      onRunStatusChange?.(status);
    },
    [onRunStatusChange],
  );
  const requestCodexConnection = useCallback(() => {
    if (onRequireCodexConnection) {
      onRequireCodexConnection();
      return;
    }
    onOpenConnectionSettings?.();
  }, [onOpenConnectionSettings, onRequireCodexConnection]);
  const ensureCodexConnection = useCallback(() => {
    if (
      !shouldRequestCodexConnectionBeforeRun({
        appServerBridge,
        codexLoginVerified,
      })
    ) {
      return true;
    }
    requestCodexConnection();
    return false;
  }, [appServerBridge, codexLoginVerified, requestCodexConnection]);
  const onRun = useMemo(
    () =>
      step === "interview"
      ? () => {
          if (!ensureCodexConnection()) return;
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
            if (!ensureCodexConnection()) return;
            cancelRequestedRef.current = false;
            void runTextPipelineAction({
              project,
              jobManager: manager,
              setRunStatus: publishRunStatus,
              isCancelled: () => cancelRequestedRef.current,
            });
          }
        : undefined,
    [ensureCodexConnection, interviewAnswers, manager, project, publishRunStatus, step],
  );
  const onCancel = () => {
    cancelRequestedRef.current = true;
    setRunStatus((status) => {
      if (status.kind !== "running") return status;
      const next = { ...status, cancelRequested: true };
      onRunStatusChange?.(next);
      return next;
    });
  };
  const topActionDisabledReason = disabledReason ?? answerDisabledReason;
  const topActionLabel = isRunning
    ? "라이브 실행 중"
    : (actionLabelOverride ?? answerPanelLabel ?? (gate.kind === "not_applicable" ? "" : gate.actionLabel));

  useEffect(() => {
    if (!onPrimaryActionChange) return;
    if (suppressPrimaryAction || gate.kind === "not_applicable") {
      onPrimaryActionChange(undefined);
      return;
    }
    const disabled = gate.kind !== "ready" || isRunning || onRun === undefined || topActionDisabledReason !== undefined;
    onPrimaryActionChange({
      label: topActionLabel,
      detail: primaryActionDetail({
        gateKind: gate.kind,
        runStatus: visibleRunStatus,
        disabledReason: topActionDisabledReason,
        isAnsweringInterview,
        missingAnswerCount,
      }),
      disabled,
      busy: isRunning,
      onClick: disabled ? undefined : onRun,
    });
    return () => onPrimaryActionChange(undefined);
  }, [
    gate.kind,
    isAnsweringInterview,
    isRunning,
    missingAnswerCount,
    onPrimaryActionChange,
    onRun,
    suppressPrimaryAction,
    topActionDisabledReason,
    topActionLabel,
    visibleRunStatus,
  ]);

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
        />
      ) : null}
    </>
  );
}

function primaryActionDetail(input: {
  readonly gateKind: "ready" | "blocked";
  readonly runStatus: ProductionTextWorkflowRunStatus;
  readonly disabledReason?: string;
  readonly isAnsweringInterview: boolean;
  readonly missingAnswerCount: number;
}): string {
  if (input.runStatus.kind === "running") return input.runStatus.message;
  if (input.runStatus.kind === "failed") return "실행 실패. 상태 패널에서 원인과 재시도를 확인하세요.";
  if (input.disabledReason) return input.disabledReason;
  if (input.gateKind === "blocked") return "실행 전 필요한 연결/승인 조건이 남아 있습니다.";
  if (input.isAnsweringInterview) {
    return input.missingAnswerCount > 0
      ? `필수 답변 ${input.missingAnswerCount}개 입력 필요`
      : "상단 버튼으로 답변을 제출하고 브리프를 생성합니다.";
  }
  return input.runStatus.kind === "succeeded"
    ? input.runStatus.message
    : "실행 상태에 맞춰 이 버튼이 다음 액션으로 바뀝니다.";
}
