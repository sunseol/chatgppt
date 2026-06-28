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
  research: "다음 액션: 출처와 핵심 주장을 확인하고 조사 결과를 승인하세요.",
  plan: "다음 액션: 슬라이드 구조와 사용할 자료를 확인한 뒤 승인하세요.",
  design: "다음 액션: 색상, 글꼴, 미리보기를 확인하고 승인하세요.",
  layout: "다음 액션: 배치 초안과 수정 요청을 확인하고 승인하세요.",
  generate: "다음 액션: 슬라이드 이미지 생성을 완료하세요.",
  review: "다음 액션: 생성된 슬라이드를 검토하고 승인하세요.",
  vectorize: "다음 액션: 편집기에서 레이어 준비를 완료하세요.",
  editor: "다음 액션: 편집 가능한 캔버스를 확인하고 최종 보고로 이동하세요.",
  export: "다음 액션: 보고서와 내보내기 파일을 검증하세요.",
};

const LOCK_REASONS: Record<StepKey, string> = {
  project: "잠김: 프로젝트 정보를 먼저 준비해야 합니다.",
  interview: "잠김: 프로젝트 생성 후 인터뷰를 시작할 수 있습니다.",
  research: "잠김: 승인된 인터뷰 브리프가 필요합니다.",
  plan: "잠김: 승인된 조사 근거가 필요합니다.",
  design: "잠김: 승인된 슬라이드 기획이 필요합니다.",
  layout: "잠김: 승인된 디자인 시스템이 필요합니다.",
  generate: "잠김: 승인된 레이아웃이 필요합니다.",
  review: "잠김: 생성 완료된 슬라이드 이미지가 필요합니다.",
  vectorize: "잠김: 승인된 검토 결과가 필요합니다.",
  editor: "잠김: 승인된 검토 결과가 필요합니다.",
  export: "잠김: 최종 편집 완료가 필요합니다.",
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
      detail: getStatusDetail(status, step.key, step.label, isCurrent),
    };
  }).filter((item) => item.key !== "vectorize");
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
        ? "앞 단계 내용이 바뀌었습니다. 이 단계 결과를 다시 확인해주세요."
        : "앞 단계 내용이 바뀌어 다시 확인이 필요합니다.";
    case "locked":
      return getLockReason(stepKey);
    default:
      return assertNever(status);
  }
}

function getLockReason(stepKey: StepKey): string {
  return LOCK_REASONS[stepKey];
}

function assertNever(value: never): never {
  throw new Error(`Unexpected workflow stepper status: ${String(value)}`);
}
