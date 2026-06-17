import type { DeckProject, StepKey } from "./deck-types";
import { STEPS, stageToStep, stepIndex } from "./deck-types";
import { isStepReachable } from "./workflow-engine";

export type WorkflowStepStatus = "available" | "completed" | "current" | "invalidated" | "locked";

export type WorkflowStepItem = {
  readonly key: StepKey;
  readonly label: string;
  readonly sub: string;
  readonly index: number;
  readonly reachable: boolean;
  readonly isCurrent: boolean;
  readonly status: WorkflowStepStatus;
  readonly statusLabel: string;
  readonly detail: string;
};

const CURRENT_ACTIONS: Record<StepKey, string> = {
  project: "다음 액션: 프로젝트 정보를 확인하고 인터뷰를 시작하세요.",
  interview: "다음 액션: 인터뷰 답변을 정리하고 브리프를 승인하세요.",
  research: "다음 액션: 출처와 클레임을 검토하고 조사 결과를 승인하세요.",
  plan: "다음 액션: 덱 구조와 슬라이드 근거를 검증한 뒤 승인하세요.",
  design: "다음 액션: 디자인 토큰과 규칙을 검토하고 승인하세요.",
  layout: "다음 액션: HTML 레이아웃과 검증 결과를 확인하고 승인하세요.",
  generate: "다음 액션: 슬라이드 이미지 생성을 완료하세요.",
  review: "다음 액션: 생성된 슬라이드를 검토하고 승인하세요.",
  vectorize: "다음 액션: 편집 가능한 레이어 변환을 검토하고 승인하세요.",
  editor: "다음 액션: 캔버스 편집을 마치고 최종 보고로 이동하세요.",
  export: "다음 액션: 보고서와 내보내기 파일을 검증하세요.",
};

export function getWorkflowStepItems(project: DeckProject): readonly WorkflowStepItem[] {
  const currentStep = stageToStep(project.stage);
  const currentIndex = stepIndex(currentStep);

  return STEPS.map((step, index) => {
    const reachable = isStepReachable(project, step.key);
    const isCurrent = step.key === currentStep;
    const status = getWorkflowStepStatus({
      invalidated: project.invalidated[step.key] === true,
      isCompleted: index < currentIndex,
      isCurrent,
      reachable,
    });

    return {
      key: step.key,
      label: step.label,
      sub: step.sub,
      index,
      reachable,
      isCurrent,
      status,
      statusLabel: getStatusLabel(status, isCurrent),
      detail: getStatusDetail(status, step.key, step.label, index, isCurrent),
    };
  });
}

function getWorkflowStepStatus(input: {
  readonly invalidated: boolean;
  readonly isCompleted: boolean;
  readonly isCurrent: boolean;
  readonly reachable: boolean;
}): WorkflowStepStatus {
  if (input.invalidated) return "invalidated";
  if (input.isCurrent) return "current";
  if (input.isCompleted) return "completed";
  if (!input.reachable) return "locked";
  return "available";
}

function getStatusLabel(status: WorkflowStepStatus, isCurrent: boolean): string {
  switch (status) {
    case "available":
      return "시작 가능";
    case "completed":
      return "완료";
    case "current":
      return "현재 단계";
    case "invalidated":
      return isCurrent ? "현재 단계 · 재생성 필요" : "재생성 필요";
    case "locked":
      return "잠김";
    default:
      return assertNever(status);
  }
}

function getStatusDetail(
  status: WorkflowStepStatus,
  stepKey: StepKey,
  label: string,
  index: number,
  isCurrent: boolean,
): string {
  switch (status) {
    case "available":
      return `다음 액션: ${label} 단계로 이동할 수 있습니다.`;
    case "completed":
      return "완료됨: 산출물을 다시 확인할 수 있습니다.";
    case "current":
      return CURRENT_ACTIONS[stepKey];
    case "invalidated":
      return isCurrent
        ? "현재 단계 산출물이 무효화되었습니다. 재생성 또는 재승인이 필요합니다."
        : "상위 단계 변경으로 산출물이 무효화되었습니다. 재생성 또는 재승인이 필요합니다.";
    case "locked":
      return getLockReason(index);
    default:
      return assertNever(status);
  }
}

function getLockReason(index: number): string {
  const previous = STEPS[index - 1];
  if (!previous) return "잠김: 이전 승인 완료 후 접근할 수 있습니다.";
  return `잠김: ${previous.label} 승인 후 접근할 수 있습니다.`;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected workflow stepper status: ${String(value)}`);
}
