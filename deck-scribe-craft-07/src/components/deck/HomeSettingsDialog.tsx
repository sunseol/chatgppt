import { useState } from "react";
import { Activity, CheckCircle2, KeyRound, LogIn, RefreshCw, WifiOff } from "lucide-react";
import { ProviderCapabilityMatrix } from "@/components/deck/ProviderCapabilityMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CODEX_APP_SERVER_CAPABILITIES } from "@/lib/client-provider-runtime-selection";
import {
  createCodexLiveStatusView,
  createCodexProviderStatus,
  createCodexStatusActionError,
  type CodexLoginStatus,
  type CodexSmokeStatus,
  type CodexStatusActionError,
} from "@/lib/codex-live-status";
import { createProviderCapabilityMatrixView } from "@/lib/provider-capability-view";
import {
  saveDesktopOpenAIImageApiKey,
  type DesktopOpenAIImageSecretReference,
} from "@/lib/desktop-openai-image";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export type SettingsSmokeStatus = CodexSmokeStatus;
export type SettingsCodexLoginStatus = CodexLoginStatus;
type SettingsOpenAIImageKeyStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved"; readonly reference: DesktopOpenAIImageSecretReference }
  | { readonly kind: "missing" }
  | { readonly kind: "failed"; readonly message: string };

export function SettingsDialogBody({
  appServerBridge,
  loginStatus,
  smokeStatus,
  onRefreshLogin,
  onOpenLogin,
  onRunSmoke,
}: {
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly loginStatus: SettingsCodexLoginStatus;
  readonly smokeStatus: SettingsSmokeStatus;
  readonly onRefreshLogin: () => void;
  readonly onOpenLogin: () => void;
  readonly onRunSmoke: () => void;
}) {
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageKeyStatus, setImageKeyStatus] = useState<SettingsOpenAIImageKeyStatus>({
    kind: "idle",
  });
  const liveStatus = createCodexLiveStatusView({
    bridge: appServerBridge,
    login: loginStatus,
    smoke: smokeStatus,
    workflow: { kind: "idle" },
  });
  const providerMatrixView = createProviderCapabilityMatrixView({
    providerName: "Codex",
    authMode: "codex_session",
    status: createCodexProviderStatus(liveStatus),
    capabilities: CODEX_APP_SERVER_CAPABILITIES,
  });
  const saveImageApiKey = async () => {
    setImageKeyStatus({ kind: "saving" });
    const result = await saveDesktopOpenAIImageApiKey({ apiKey: imageApiKey });
    switch (result.kind) {
      case "completed":
        setImageApiKey("");
        setImageKeyStatus({ kind: "saved", reference: result.reference });
        return;
      case "missing_bridge":
        setImageKeyStatus({ kind: "missing" });
        return;
      case "failed":
        setImageKeyStatus({ kind: "failed", message: result.error.message });
        return;
      default:
        assertNever(result);
    }
  };

  return (
    <div className="min-w-0 space-y-4 text-sm">
      <div className="border border-border bg-background p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          현재 Codex 상태
        </div>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
          <StatusGlyph ok={liveStatus.isVerified} />
          <span className="font-medium">{liveStatus.label}</span>
          <span className="text-xs text-muted-foreground">{liveStatus.summary}</span>
        </div>
        <div className="mt-2 break-words text-xs text-muted-foreground">{liveStatus.detail}</div>
        {liveStatus.error ? <ActionableError error={liveStatus.error} /> : null}
      </div>
      <StatusRow
        label="Codex 실행 통로"
        value={bridgeStatusText(appServerBridge)}
        ok={appServerBridge === "available"}
      />
      <StatusRow label="데스크톱 실행 환경" value="Tauri v2" ok />
      <div className="min-w-0 overflow-hidden border border-border bg-background p-3">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <div className="font-medium">Codex CLI 로그인</div>
            <div className="mt-1 max-h-32 min-w-0 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {loginStatusText(loginStatus)}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Codex 상태 확인"
              className="w-full justify-center sm:w-auto"
              onClick={onRefreshLogin}
              disabled={appServerBridge !== "available" || loginStatus.kind === "running"}
            >
              <RefreshCw className="h-4 w-4" />
              Codex 상태 확인
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Codex 로그인"
              className="w-full justify-center sm:w-auto"
              onClick={onOpenLogin}
              disabled={appServerBridge !== "available" || loginStatus.kind === "opening"}
            >
              <LogIn className="h-4 w-4" />
              Codex 로그인
            </Button>
          </div>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden border border-border bg-background p-3">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <div className="font-medium">OpenAI 이미지 API Key</div>
            <div className="mt-1 min-w-0 whitespace-pre-wrap break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {imageKeyStatusText(imageKeyStatus)}
            </div>
            {imageKeyStatus.kind === "failed" ? (
              <ActionableError
                error={createCodexStatusActionError({
                  code: "openai_image_key_failed",
                  message: imageKeyStatus.message,
                })}
              />
            ) : null}
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              type="password"
              value={imageApiKey}
              placeholder="sk-..."
              aria-label="OpenAI 이미지 API Key"
              autoComplete="off"
              onChange={(event) => setImageApiKey(event.currentTarget.value)}
              disabled={imageKeyStatus.kind === "saving"}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="OpenAI 이미지 API Key 저장"
              className="w-full justify-center sm:w-auto"
              onClick={saveImageApiKey}
              disabled={imageKeyStatus.kind === "saving" || imageApiKey.trim().length === 0}
            >
              <KeyRound className="h-4 w-4" />
              Keychain 저장
            </Button>
          </div>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden border border-border bg-background p-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="font-medium">라이브 실행 테스트</div>
            <div className="mt-1 min-w-0 whitespace-pre-wrap break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {smokeStatusText(smokeStatus)}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full justify-center sm:w-auto"
            onClick={onRunSmoke}
            disabled={appServerBridge !== "available" || smokeStatus.kind === "running"}
          >
            <Activity className="h-4 w-4" />
            연결 확인
          </Button>
        </div>
      </div>
      <details className="border border-border bg-paper">
        <summary
          role="button"
          aria-label="Provider 기능 상세"
          className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Provider 기능 상세
        </summary>
        <div className="border-t border-border p-3">
          <ProviderCapabilityMatrix view={providerMatrixView} />
        </div>
      </details>
    </div>
  );
}

function imageKeyStatusText(status: SettingsOpenAIImageKeyStatus): string {
  switch (status.kind) {
    case "idle":
      return "이미지 생성에 사용할 별도 OpenAI API Key를 macOS Keychain에 저장합니다.";
    case "saving":
      return "OpenAI 이미지 API Key를 Keychain에 저장하는 중입니다.";
    case "saved":
      return `Keychain 저장 완료: ${status.reference.account}`;
    case "missing":
      return "데스크톱 연결을 찾지 못했습니다. Tauri 앱에서 다시 시도하세요.";
    case "failed":
      return createCodexStatusActionError({
        code: "openai_image_key_failed",
        message: status.message,
      }).title;
    default:
      return assertNever(status);
  }
}

function StatusRow({
  label,
  value,
  ok,
}: {
  readonly label: string;
  readonly value: string;
  readonly ok: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border border-border bg-background p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="font-medium">{label}</div>
      <div className="flex min-w-0 items-center gap-2 break-all font-mono text-xs [overflow-wrap:anywhere]">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" />
        )}
        {value}
      </div>
    </div>
  );
}

function StatusGlyph({ ok }: { readonly ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
  ) : (
    <WifiOff className="h-4 w-4 shrink-0 text-warning" />
  );
}

function ActionableError({ error }: { readonly error: CodexStatusActionError }) {
  return (
    <div className="mt-3 border border-destructive/30 bg-destructive/10 p-3 text-xs">
      <div className="font-medium text-destructive">{error.title}</div>
      <div className="mt-1 text-muted-foreground">원인: {error.cause}</div>
      <div className="mt-1 text-muted-foreground">조치: {error.action}</div>
    </div>
  );
}

function bridgeStatusText(status: ProductionTextWorkflowBridgeStatus): string {
  switch (status) {
    case "available":
      return "앱 실행 통로 확인됨";
    case "missing":
      return "Bridge 없음 (missing)";
    default:
      return assertNever(status);
  }
}

function smokeStatusText(status: SettingsSmokeStatus): string {
  switch (status.kind) {
    case "idle":
      return "아직 확인하지 않았습니다.";
    case "running":
      return "Codex 연결을 확인하는 중입니다.";
    case "completed":
      return `app-server smoke 성공: ${status.accountType} · ${status.threadId} · ${status.turnId}`;
    case "missing":
      return "데스크톱 연결을 찾지 못했습니다. 앱을 다시 실행한 뒤 연결 확인을 눌러주세요.";
    case "failed":
      return createCodexStatusActionError({ code: "smoke_failed", message: status.message }).title;
    default:
      return assertNever(status);
  }
}

function loginStatusText(status: SettingsCodexLoginStatus): string {
  switch (status.kind) {
    case "idle":
      return "아직 확인하지 않았습니다.";
    case "running":
      return "Codex CLI 로그인 상태 확인 중입니다.";
    case "opening":
      return "Terminal에서 Codex 로그인을 여는 중입니다.";
    case "opened":
      return `${status.command} 창을 열었습니다. 로그인을 마친 뒤 상태를 새로고침하세요.`;
    case "completed":
      return (
        status.output || (status.success ? "Codex CLI 로그인됨" : "Codex CLI 로그인이 필요합니다.")
      );
    case "missing":
      return "데스크톱 연결을 찾지 못했습니다. 앱을 다시 실행한 뒤 상태를 새로고침하세요.";
    case "failed":
      return createCodexStatusActionError({
        code: "login_status_failed",
        message: status.message,
      }).title;
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled settings dialog state: ${JSON.stringify(value)}`);
}
