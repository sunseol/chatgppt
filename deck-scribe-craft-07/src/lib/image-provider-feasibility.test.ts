import { describe, expect, test } from "bun:test";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";

describe("image provider feasibility", () => {
  test("selects OpenAIImageProvider when Codex image generation is not confirmed", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    expect(decision.providerId).toBe("openaiImage");
    expect(decision.authMode).toBe("openaiApiKey");
    expect(decision.targetModel).toBe("gpt-image-2");
    expect(decision.setup).toBe("ready");
    expect(decision.excludedRoutes).toEqual([
      {
        route: "codexOAuth",
        reason: "Codex image generation is not confirmed for this runtime.",
      },
    ]);
  });

  test("keeps OpenAIImageProvider concrete but requires setup when API credentials are missing", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "notSupported",
      apiCredential: "missing",
      organizationVerification: "unknown",
    });

    expect(decision.providerId).toBe("openaiImage");
    expect(decision.setup).toBe("requiresApiCredential");
  });

  test("allows CodexProvider only when the runtime explicitly confirms image capability", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "confirmed",
      apiCredential: "missing",
      organizationVerification: "unknown",
    });

    expect(decision.providerId).toBe("codex");
    expect(decision.authMode).toBe("codexOAuth");
    expect(decision.setup).toBe("ready");
    expect(decision.productCopy.connection.includes("separate OpenAI API credential")).toBe(false);
  });

  test("explains billing, permission, and verification differences for the fallback route", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "required",
    });

    expect(decision.setup).toBe("requiresOrganizationVerification");
    expect(decision.productCopy.connection.includes("separate OpenAI API credential")).toBe(true);
    expect(decision.productCopy.billing.includes("API organization/project")).toBe(true);
    expect(decision.productCopy.permission.includes("organization verification")).toBe(true);
  });

  test("keeps OpenAIImageProvider blocked while organization verification is unknown", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "unknown",
    });

    expect(decision.providerId).toBe("openaiImage");
    expect(decision.setup).toBe("requiresOrganizationVerification");
    expect(decision.productCopy.permission.includes("organization verification")).toBe(true);
  });
});
