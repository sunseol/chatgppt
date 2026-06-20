import type { ProviderCapabilityMatrixInput } from "./provider-capability-view";
import type { ExecutionMode } from "./provider-provenance";
import { ProviderCapabilities } from "./provider-types";
import type { SlideImageProviderId } from "./slide-image-provider";

const PRODUCTION_CODEX_PROVIDER_MATRIX: ProviderCapabilityMatrixInput = {
  providerName: "Codex",
  authMode: "codex_session",
  status: {
    kind: "requiresAuth",
    providerId: "codex",
    message: "Sign in with ChatGPT or complete the Codex device-code flow.",
  },
  capabilities: [],
};

const DEVELOPMENT_MOCK_PROVIDER_MATRIX: ProviderCapabilityMatrixInput = {
  providerName: "Mock Provider",
  authMode: "none",
  status: {
    kind: "connected",
    providerId: "mock",
    message: "Local workflow prototype provider is connected.",
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
): Extract<SlideImageProviderId, "mock" | "codex"> {
  switch (executionMode) {
    case "production":
      return "codex";
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
