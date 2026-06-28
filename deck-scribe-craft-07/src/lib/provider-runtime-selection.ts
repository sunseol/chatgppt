import type { ProviderCapabilityMatrixInput } from "./provider-capability-view";
import type { ExecutionMode } from "./provider-provenance";
import { ProviderCapabilities } from "./provider-types";

const PRODUCTION_CODEX_PROVIDER_MATRIX: ProviderCapabilityMatrixInput = {
  providerName: "Codex",
  authMode: "codex_session",
  status: {
    kind: "requiresAuth",
    providerId: "codex",
    message: "ChatGPT 로그인 또는 Codex device-code 로그인을 완료하세요.",
  },
  capabilities: [],
};

const DEVELOPMENT_MOCK_PROVIDER_MATRIX: ProviderCapabilityMatrixInput = {
  providerName: "Mock Provider",
  authMode: "none",
  status: {
    kind: "connected",
    providerId: "mock",
    message: "로컬 샘플 provider입니다. 실제 Codex 실행 결과가 아닙니다.",
  },
  capabilities: ProviderCapabilities,
};

export function createNewProjectProviderMatrixInput(
  executionMode: ExecutionMode,
): ProviderCapabilityMatrixInput {
  switch (executionMode) {
    case "production":
      return PRODUCTION_CODEX_PROVIDER_MATRIX;
    case "development":
    case "test":
      return DEVELOPMENT_MOCK_PROVIDER_MATRIX;
    default:
      return assertNever(executionMode);
  }
}

export function selectImageGenerationProviderId(
  executionMode: ExecutionMode,
): "mock" | "openaiImage" {
  switch (executionMode) {
    case "production":
      return "openaiImage";
    case "development":
    case "test":
      return "mock";
    default:
      return assertNever(executionMode);
  }
}

export function executionModeFromProductionFlag(isProductionBuild: boolean): ExecutionMode {
  return isProductionBuild ? "production" : "development";
}

function assertNever(value: never): never {
  throw new Error(`Unhandled provider runtime selection mode: ${String(value)}`);
}
