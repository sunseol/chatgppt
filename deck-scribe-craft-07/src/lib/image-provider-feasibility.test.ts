import { describe, expect, test } from "bun:test";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";

describe("image provider feasibility", () => {
  test("keeps Codex OAuth as the production route while image capability is unverified", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    expect(decision.providerId).toBe("codex");
    expect(decision.authMode).toBe("codexOAuth");
    expect(decision.targetModel).toBe("gpt-image-2");
    expect(decision.setup).toBe("requiresCodexImageCapability");
    expect(decision.excludedRoutes).toEqual([
      {
        route: "openaiApiKey",
        reason: "OpenAI API-key image generation is not the production route.",
      },
    ]);
  });

  test("does not fall back to OpenAI API keys when Codex image capability is unavailable", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "notSupported",
      apiCredential: "missing",
      organizationVerification: "unknown",
    });

    expect(decision.providerId).toBe("codex");
    expect(decision.authMode).toBe("codexOAuth");
    expect(decision.setup).toBe("requiresCodexImageCapability");
    expect(decision.productCopy.connection.includes("OpenAI API credential")).toBe(false);
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

  test("explains billing and permission through the signed-in Codex account", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "required",
    });

    expect(decision.setup).toBe("requiresCodexImageCapability");
    expect(decision.productCopy.connection.includes("Codex OAuth session")).toBe(true);
    expect(decision.productCopy.billing.includes("Codex account")).toBe(true);
    expect(decision.productCopy.permission.includes("Codex image generation")).toBe(true);
  });

  test("ignores organization verification as an API-key concern for the Codex route", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "available",
      organizationVerification: "unknown",
    });

    expect(decision.providerId).toBe("codex");
    expect(decision.setup).toBe("requiresCodexImageCapability");
    expect(decision.productCopy.permission.includes("organization verification")).toBe(false);
  });
});
