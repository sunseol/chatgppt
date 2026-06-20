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
  | "requiresOrganizationVerification";

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
    providerId: "openaiImage",
    authMode: "openaiApiKey",
    targetModel: TARGET_IMAGE_MODEL,
    setup: getOpenAIImageSetup(input),
    excludedRoutes: [
      {
        route: "codexOAuth",
        reason: "Codex image generation is not confirmed for this runtime.",
      },
    ],
    productCopy: {
      connection:
        "Image generation uses a separate OpenAI API credential; Codex login does not unlock this path by itself.",
      billing:
        "Image usage may be billed to the API organization/project that owns the credential.",
      permission: "Some GPT Image models may require organization verification before use.",
    },
  };
}

function getOpenAIImageSetup(input: ImageProviderFeasibilityInput): ImageProviderSetup {
  if (input.apiCredential === "missing") return "requiresApiCredential";
  if (input.organizationVerification !== "verified") return "requiresOrganizationVerification";
  return "ready";
}
