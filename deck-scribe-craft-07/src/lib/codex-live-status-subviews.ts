import type { ProductionTextWorkflowBridgeStatus } from "./production-text-workflow-gate";
import { createCodexStatusActionError } from "./codex-live-status-error";
import type {
  CodexLiveStatusView,
  CodexLoginStatus,
  CodexSmokeStatus,
  CodexStatusActionError,
  CodexWorkflowRunStatus,
} from "./codex-live-status-types";

export function workflowStatusView(
  workflow: CodexWorkflowRunStatus,
  bridge: ProductionTextWorkflowBridgeStatus,
): CodexLiveStatusView | undefined {
  switch (workflow.kind) {
    case "idle":
      return undefined;
    case "running":
      return {
        kind: "running",
        label: "실행 중",
        summary: workflow.message,
        detail: `현재 단계: ${workflow.currentStep}. 예상 단계: ${workflow.expectedSteps.join(" → ")}.`,
        actionLabel: workflow.cancelRequested ? "취소 요청됨" : "취소 요청",
        isVerified: true,
        canAttemptWorkflow: bridge === "available",
        canCancel: !workflow.cancelRequested,
      };
    case "succeeded":
      return {
        kind: "succeeded",
        label: "성공",
        summary: workflow.message,
        detail: workflow.currentStep ? `완료 단계: ${workflow.currentStep}` : workflow.message,
        actionLabel: "다음 단계로 진행",
        isVerified: true,
        canAttemptWorkflow: bridge === "available",
        canCancel: false,
      };
    case "cancelled":
      return {
        kind: "failed",
        label: "중단됨",
        summary: workflow.message,
        detail: "현재 요청 완료 후 화면 반영을 중단했습니다.",
        actionLabel: "재시도",
        isVerified: false,
        canAttemptWorkflow: bridge === "available",
        canCancel: false,
      };
    case "failed":
      return failedWorkflowView(workflow, bridge);
    default:
      return assertNever(workflow);
  }
}

export function loginStatusView(login: CodexLoginStatus): CodexLiveStatusView | undefined {
  switch (login.kind) {
    case "idle":
    case "opened":
      return undefined;
    case "running":
    case "opening":
      return {
        kind: "login_checking",
        label: "로그인 확인 중",
        summary: login.kind === "opening" ? "Codex 로그인 열기 중" : "Codex 로그인 상태 확인 중",
        detail: "Codex CLI 로그인 상태를 확인하고 있습니다.",
        actionLabel: "잠시 기다리기",
        isVerified: false,
        canAttemptWorkflow: true,
        canCancel: false,
      };
    case "completed":
      if (login.success) return undefined;
      return {
        kind: "login_required",
        label: "로그인 필요",
        summary: "Codex 로그인이 필요합니다",
        detail: login.output
          ? `Codex 로그인이 필요합니다. 상태 출력: ${login.output}`
          : "Codex 로그인이 필요합니다. 로그인 후 상태를 다시 확인하세요.",
        actionLabel: "Codex 로그인 열기",
        isVerified: false,
        canAttemptWorkflow: true,
        canCancel: false,
      };
    case "missing":
      return undefined;
    case "failed":
      return failedView(
        createCodexStatusActionError({
          code: "login_status_failed",
          message: login.message,
        }),
      );
    default:
      return assertNever(login);
  }
}

export function smokeStatusView(
  smoke: CodexSmokeStatus,
  login: CodexLoginStatus,
): CodexLiveStatusView | undefined {
  switch (smoke.kind) {
    case "idle":
      return undefined;
    case "running":
      return {
        kind: "smoke_checking",
        label: "검증 중",
        summary: "app-server smoke 확인 중",
        detail: "Codex app-server가 실제 구조화 응답을 반환하는지 확인하고 있습니다.",
        actionLabel: "잠시 기다리기",
        isVerified: false,
        canAttemptWorkflow: true,
        canCancel: false,
      };
    case "completed":
      if (login.kind === "completed" && login.success) return verifiedSmokeView(smoke);
      return {
        kind: "bridge_detected",
        label: "Bridge 감지",
        summary: "app-server smoke 성공",
        detail: "app-server smoke는 성공했지만 Codex 로그인 확인은 아직 완료되지 않았습니다.",
        actionLabel: "로그인 상태 확인",
        isVerified: false,
        canAttemptWorkflow: true,
        canCancel: false,
      };
    case "missing":
      return undefined;
    case "failed":
      return failedView(
        createCodexStatusActionError({ code: "smoke_failed", message: smoke.message }),
      );
    default:
      return assertNever(smoke);
  }
}

function failedWorkflowView(
  workflow: Extract<CodexWorkflowRunStatus, { readonly kind: "failed" }>,
  bridge: ProductionTextWorkflowBridgeStatus,
): CodexLiveStatusView {
  const error =
    workflow.error ??
    createCodexStatusActionError({ code: "workflow_failed", message: workflow.message });
  return {
    kind: "failed",
    label: "실패",
    summary: error.title,
    detail: error.action,
    actionLabel: error.retryLabel,
    isVerified: false,
    canAttemptWorkflow: bridge === "available",
    canCancel: false,
    error,
  };
}

function verifiedSmokeView(
  smoke: Extract<CodexSmokeStatus, { readonly kind: "completed" }>,
): CodexLiveStatusView {
  return {
    kind: "verified",
    label: "검증됨",
    summary: `Codex 연결됨: ${smoke.accountType}`,
    detail: `로그인 확인 및 app-server smoke 성공. thread ${smoke.threadId}, turn ${smoke.turnId}.`,
    actionLabel: "라이브 실행 가능",
    isVerified: true,
    canAttemptWorkflow: true,
    canCancel: false,
  };
}

function failedView(error: CodexStatusActionError): CodexLiveStatusView {
  return {
    kind: "failed",
    label: "실패",
    summary: error.title,
    detail: error.action,
    actionLabel: error.retryLabel,
    isVerified: false,
    canAttemptWorkflow: true,
    canCancel: false,
    error,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected Codex live status value: ${JSON.stringify(value)}`);
}
