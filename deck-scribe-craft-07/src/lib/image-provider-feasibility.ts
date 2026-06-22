import type { ProviderKind } from "./provider-types";

export const TARGET_IMAGE_MODEL = "gpt-image-2";

export type CodexImageCapability = "confirmed" | "notSupported" | "unknown";
export type ImageApiCredential = "available" | "missing";
export type OrganizationVerification = "verified" | "required" | "unknown";
export type ImageAuthMode = "codexOAuth" | "openaiApiKey";
export type ImageProviderId = Extract<ProviderKind, "codex" | "openaiImage">;
export type ImageProviderSetup =
  | "ready"
  | "requiresApiCredential"
  | "requiresOrganizationVerification"
  | "requiresCodexImageCapability";

export interface ImageProviderFeasibilityInput {
  readonly codexImageCapability: CodexImageCapability;
  readonly apiCredential: ImageApiCredential;
  readonly organizationVerification: OrganizationVerification;
}

export interface ExcludedImageRoute {
  readonly route: ImageAuthMode;
  readonly reason: string;
}

export interface ImageProviderProductCopy {
  readonly connection: string;
  readonly billing: string;
  readonly permission: string;
}

export interface ImageProviderFeasibilityDecision {
  readonly providerId: ImageProviderId;
  readonly authMode: ImageAuthMode;
  readonly targetModel: typeof TARGET_IMAGE_MODEL;
  readonly setup: ImageProviderSetup;
  readonly excludedRoutes: readonly ExcludedImageRoute[];
  readonly productCopy: ImageProviderProductCopy;
}

export function decideImageProviderFeasibility(
  input: ImageProviderFeasibilityInput,
): ImageProviderFeasibilityDecision {
  if (input.codexImageCapability === "confirmed") {
    return {
      providerId: "codex",
      authMode: "codexOAuth",
      targetModel: TARGET_IMAGE_MODEL,
      setup: "ready",
      excludedRoutes: [],
      productCopy: {
        connection: "Image generation is available through the connected Codex runtime.",
        billing: "Usage follows the connected Codex runtime and account entitlements.",
        permission: "Image capability is enabled by the Codex runtime.",
      },
    };
  }

  return {
    providerId: "codex",
    authMode: "codexOAuth",
    targetModel: TARGET_IMAGE_MODEL,
    setup: "requiresCodexImageCapability",
    excludedRoutes: [
      {
        route: "openaiApiKey",
        reason: "OpenAI API-key image generation is not the production route.",
      },
    ],
    productCopy: {
      connection:
        "Image generation uses the connected Codex OAuth session; no separate key is required.",
      billing: "Image usage follows the signed-in Codex account usage limits and entitlements.",
      permission: "Codex image generation must be enabled for this runtime.",
    },
  };
}
