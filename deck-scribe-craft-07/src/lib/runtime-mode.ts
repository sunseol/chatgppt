import type { ProviderKind } from "./provider-types";
import type { ExecutionMode } from "./provider-provenance";

export type RuntimeProviderPolicyResult =
  | {
      readonly kind: "ready";
      readonly executionMode: ExecutionMode;
      readonly providerKind: ProviderKind;
      readonly providerId: string;
    }
  | {
      readonly kind: "blocked";
      readonly reason: string;
    };

export type RuntimeProviderPolicyInput = {
  readonly executionMode: ExecutionMode;
  readonly providerKind: ProviderKind;
  readonly providerId: string;
};

export type RuntimeModeBanner = {
  readonly tone: "warning";
  readonly label: "MOCK MODE";
  readonly message: string;
};

export type RuntimeAuditFields = {
  readonly executionMode: ExecutionMode;
  readonly providerKind: ProviderKind;
  readonly providerId: string;
};

export type RuntimeProviderFailureRecovery = {
  readonly kind: "retry_or_manual_recovery";
  readonly executionMode: ExecutionMode;
  readonly failedProviderKind: ProviderKind;
  readonly failedProviderId: string;
  readonly mockFallbackAllowed: false;
  readonly fixtureFallbackAllowed: false;
  readonly message: string;
};

export type RuntimeProviderFailureRecoveryInput = {
  readonly executionMode: ExecutionMode;
  readonly providerKind: ProviderKind;
  readonly providerId: string;
  readonly errorMessage: string;
};

export function evaluateProviderRuntimePolicy(
  input: RuntimeProviderPolicyInput,
): RuntimeProviderPolicyResult {
  if (input.executionMode === "production" && input.providerKind === "mock") {
    return {
      kind: "blocked",
      reason: "production mode cannot initialize mock providers or use mock fallback paths.",
    };
  }

  return {
    kind: "ready",
    executionMode: input.executionMode,
    providerKind: input.providerKind,
    providerId: input.providerId,
  };
}

export function createDevelopmentMockModeBanner(
  input: Pick<RuntimeProviderPolicyInput, "executionMode" | "providerKind">,
): RuntimeModeBanner | undefined {
  if (input.executionMode !== "development" || input.providerKind !== "mock") return undefined;

  return {
    tone: "warning",
    label: "MOCK MODE",
    message: "Development mock output is not Live evidence and cannot satisfy release gates.",
  };
}

export function createRuntimeAuditFields(input: RuntimeProviderPolicyInput): RuntimeAuditFields {
  return {
    executionMode: input.executionMode,
    providerKind: input.providerKind,
    providerId: input.providerId,
  };
}

export function createRuntimeProviderFailureRecovery(
  input: RuntimeProviderFailureRecoveryInput,
): RuntimeProviderFailureRecovery {
  return {
    kind: "retry_or_manual_recovery",
    executionMode: input.executionMode,
    failedProviderKind: input.providerKind,
    failedProviderId: input.providerId,
    mockFallbackAllowed: false,
    fixtureFallbackAllowed: false,
    message: `Provider ${input.providerId} failed: ${input.errorMessage} Retry or use a manual recovery path.`,
  };
}
