import { runDesktopCodexAppServerSmoke } from "@/lib/desktop-app-server-bridge";
import { readDesktopCodexLoginStatus } from "@/lib/desktop-codex-login";
import { createCodexStatusActionError, type CodexWorkflowRunStatus } from "@/lib/codex-live-status";

export type ProductionTextWorkflowRunControls = {
  readonly setRunStatus: (status: CodexWorkflowRunStatus) => void;
  readonly isCancelled: () => boolean;
};

export async function ensureCodexReady(
  input: ProductionTextWorkflowRunControls & { readonly expectedSteps: readonly string[] },
): Promise<boolean> {
  input.setRunStatus({
    kind: "running",
    message: "Codex 로그인 상태를 확인하는 중입니다.",
    currentStep: "로그인 확인",
    expectedSteps: input.expectedSteps,
    cancelRequested: false,
  });
  const login = await readDesktopCodexLoginStatus();
  if (finishIfCancelled(input)) return false;
  switch (login.kind) {
    case "missing_bridge":
      setFailed(input, "missing_bridge", "Desktop Tauri bridge is not available.");
      return false;
    case "failed":
      setFailed(input, login.error.code, login.error.message);
      return false;
    case "completed":
      if (!login.evidence.success) {
        setFailed(
          input,
          "auth_required",
          login.evidence.stdout || login.evidence.stderr || "Codex 로그인이 필요합니다.",
        );
        return false;
      }
      break;
    default:
      return assertNever(login);
  }

  input.setRunStatus({
    kind: "running",
    message: "app-server smoke를 확인하는 중입니다.",
    currentStep: "app-server smoke",
    expectedSteps: input.expectedSteps,
    cancelRequested: false,
  });
  const smoke = await runDesktopCodexAppServerSmoke();
  if (finishIfCancelled(input)) return false;
  switch (smoke.kind) {
    case "missing_bridge":
      setFailed(input, "missing_bridge", "Desktop Tauri bridge is not available.");
      return false;
    case "failed":
      setFailed(input, smoke.error.code, smoke.error.message);
      return false;
    case "completed":
      return true;
    default:
      return assertNever(smoke);
  }
}

export function finishIfCancelled(input: ProductionTextWorkflowRunControls): boolean {
  if (!input.isCancelled()) return false;
  input.setRunStatus({
    kind: "cancelled",
    message: "취소 요청됨: 현재 요청 완료 후 화면 반영을 중단했습니다.",
  });
  return true;
}

export function setFailed(
  input: ProductionTextWorkflowRunControls,
  code: string,
  message: string,
): void {
  const error = createCodexStatusActionError({ code, message });
  input.setRunStatus({ kind: "failed", message: error.title, error });
}

export function handleThrownCodexError(
  input: ProductionTextWorkflowRunControls,
  error: unknown,
): void {
  if (error instanceof Error) {
    setFailed(input, "workflow_failed", error.message);
    return;
  }
  setFailed(input, "workflow_failed", "Codex workflow failed with an unknown value.");
}

function assertNever(value: never): never {
  throw new Error(`Unhandled production text workflow preflight value: ${JSON.stringify(value)}`);
}
