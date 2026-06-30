import type { ProviderStatus } from "./provider-types";
import { loginStatusView, smokeStatusView, workflowStatusView } from "./codex-live-status-subviews";
import type { CodexLiveStatusInput, CodexLiveStatusView } from "./codex-live-status-types";

export function createCodexLiveStatusView(input: CodexLiveStatusInput): CodexLiveStatusView {
  const workflowView = workflowStatusView(input.workflow, input.bridge);
  if (workflowView !== undefined) return workflowView;

  if (input.bridge === "missing") {
    return {
      kind: "bridge_missing",
      label: "Bridge 없음",
      summary: "앱 실행 통로 없음",
      detail: "DMG/Tauri 앱에서 열어야 Codex 실행 통로를 확인할 수 있습니다.",
      actionLabel: "데스크톱 앱에서 다시 열기",
      isVerified: false,
      canAttemptWorkflow: false,
      canCancel: false,
    };
  }

  const loginView = loginStatusView(input.login);
  if (loginView !== undefined) return loginView;

  const smokeView = smokeStatusView(input.smoke, input.login);
  if (smokeView !== undefined) return smokeView;

  return {
    kind: "bridge_detected",
    label: "Bridge 감지",
    summary: "앱 실행 통로 확인됨",
    detail:
      "Codex 로그인과 app-server smoke는 아직 검증되지 않았습니다. 실행 시 Codex 상태 확인을 먼저 진행합니다.",
    actionLabel: "실행 시 Codex 상태 확인",
    isVerified: false,
    canAttemptWorkflow: true,
    canCancel: false,
  };
}

export function createCodexProviderStatus(view: CodexLiveStatusView): ProviderStatus {
  switch (view.kind) {
    case "verified":
    case "running":
    case "succeeded":
      return { kind: "connected", providerId: "codex", message: view.summary };
    case "bridge_detected":
    case "login_checking":
    case "smoke_checking":
      return {
        kind: "bridgeDetected",
        providerId: "codex",
        message: `${view.summary}. ${view.detail}`,
      };
    case "login_required":
      return { kind: "requiresAuth", providerId: "codex", message: view.detail };
    case "failed":
      return { kind: "liveTestFailed", providerId: "codex", message: view.detail };
    case "bridge_missing":
      return { kind: "unavailable", providerId: "codex", message: view.detail };
    default:
      return assertNever(view.kind);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected Codex live status value: ${JSON.stringify(value)}`);
}
