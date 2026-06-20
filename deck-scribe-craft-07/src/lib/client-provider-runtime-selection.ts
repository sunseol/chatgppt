import type { ProviderCapabilityMatrixInput } from "./provider-capability-view";
import { ProviderCapabilities } from "./provider-types";

export const newProjectProviderMatrixInput: ProviderCapabilityMatrixInput = import.meta.env.PROD
  ? {
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "requiresAuth",
        providerId: "codex",
        message: "Sign in with ChatGPT or complete the Codex device-code flow.",
      },
      capabilities: [],
    }
  : {
      providerName: "Mock Provider",
      authMode: "none",
      status: {
        kind: "connected",
        providerId: "mock",
        message: "Local workflow prototype provider is connected.",
      },
      capabilities: ProviderCapabilities,
    };

export const imageGenerationProviderId = import.meta.env.PROD ? "codex" : "mock";
