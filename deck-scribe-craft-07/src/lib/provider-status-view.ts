import type { ProviderAuthMode } from "./provider-provenance";
import type { ProviderStatus } from "./provider-types";

export type ProviderStatusLock = {
  readonly reason: string;
  readonly actionLabel: string;
};

export function providerStatusLabel(status: ProviderStatus): string {
  switch (status.kind) {
    case "connected":
      return "Connected";
    case "requiresAuth":
      return "Needs Login";
    case "needsApiKey":
      return "Needs API Key";
    case "liveTestFailed":
      return "Live Test Failed";
    case "unavailable":
      return "Unavailable";
    default:
      return assertNever(status);
  }
}

export function providerAuthModeLabel(authMode: ProviderAuthMode): string {
  switch (authMode) {
    case "none":
      return "None";
    case "codex_session":
      return "Codex session";
    case "api_key":
      return "API key";
    case "local":
      return "Local";
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
    case "requiresAuth":
      return {
        reason: `${providerName} requires authentication: ${status.message}`,
        actionLabel: "Provider 로그인",
      };
    case "needsApiKey":
      return {
        reason: `${providerName} requires an API key: ${status.message}`,
        actionLabel: "API Key 설정",
      };
    case "liveTestFailed":
      return {
        reason: `${providerName} live test failed: ${status.message}`,
        actionLabel: "Live 테스트 재실행",
      };
    case "unavailable":
      return {
        reason: `${providerName} is unavailable: ${status.message}`,
        actionLabel: "Provider 상태 확인",
      };
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected provider status view value: ${String(value)}`);
}
