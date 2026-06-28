import type { ProviderAuthMode } from "./provider-provenance";
import type { ProviderStatus } from "./provider-types";

export type ProviderStatusLock = {
  readonly reason: string;
  readonly actionLabel: string;
};

export function providerStatusLabel(status: ProviderStatus): string {
  switch (status.kind) {
    case "connected":
      return "연결됨";
    case "bridgeDetected":
      return "Bridge 감지";
    case "requiresAuth":
      return "로그인 필요";
    case "needsApiKey":
      return "API Key 필요";
    case "liveTestFailed":
      return "라이브 테스트 실패";
    case "unavailable":
      return "사용 불가";
    default:
      return assertNever(status);
  }
}

export function providerAuthModeLabel(authMode: ProviderAuthMode): string {
  switch (authMode) {
    case "none":
      return "없음";
    case "codex_session":
      return "Codex 세션";
    case "api_key":
      return "API Key";
    case "local":
      return "로컬";
    default:
      return assertNever(authMode);
  }
}

export function createProviderStatusLock(
  providerName: string,
  status: ProviderStatus,
): ProviderStatusLock | undefined {
  switch (status.kind) {
    case "connected":
      return undefined;
    case "bridgeDetected":
      return {
        reason: `${providerName} 앱 실행 통로만 확인됨. 실행 시 Codex 상태 확인으로 로그인과 app-server smoke를 검증하세요.`,
        actionLabel: "Codex 상태 확인",
      };
    case "requiresAuth":
      return {
        reason: `${providerName} 로그인이 필요합니다: ${status.message}`,
        actionLabel: "Provider 로그인",
      };
    case "needsApiKey":
      return {
        reason: `${providerName} API Key가 필요합니다: ${status.message}`,
        actionLabel: "API Key 설정",
      };
    case "liveTestFailed":
      return {
        reason: `${providerName} 라이브 테스트에 실패했습니다: ${status.message}`,
        actionLabel: "Live 테스트 재실행",
      };
    case "unavailable":
      return {
        reason: `연결 및 실행 환경에서 ${providerName} 연결 상태를 확인하세요.`,
        actionLabel: "Provider 상태 확인",
      };
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected provider status view value: ${String(value)}`);
}
