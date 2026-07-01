import { describe, expect, test } from "bun:test";
import {
  createDevelopmentMockModeBanner,
  createRuntimeAuditFields,
  createRuntimeProviderFailureRecovery,
  evaluateProviderRuntimePolicy,
} from "./runtime-mode";

describe("runtime mode policy", () => {
  test("blocks mock providers before production job startup", () => {
    const result = evaluateProviderRuntimePolicy({
      executionMode: "production",
      providerKind: "mock",
      providerId: "mock",
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.reason.includes("production")).toBe(true);
    expect(result.reason.includes("mock")).toBe(true);
  });

  test("keeps a persistent development mock mode banner", () => {
    const banner = createDevelopmentMockModeBanner({
      executionMode: "development",
      providerKind: "mock",
    });

    expect(banner?.tone).toBe("warning");
    expect(banner?.label).toBe("MOCK MODE");
    expect(banner?.message.includes("not Live evidence")).toBe(true);
  });

  test("records runtime mode and provider kind for audit events", () => {
    const fields = createRuntimeAuditFields({
      executionMode: "test",
      providerKind: "codex",
      providerId: "codex-local",
    });

    expect(fields).toEqual({
      executionMode: "test",
      providerKind: "codex",
      providerId: "codex-local",
    });
  });

  test("does not offer automatic mock fallback after a live provider failure", () => {
    const recovery = createRuntimeProviderFailureRecovery({
      executionMode: "production",
      providerKind: "codex",
      providerId: "codex",
      errorMessage: "Authenticated turn failed.",
    });

    expect(recovery).toEqual({
      kind: "retry_or_manual_recovery",
      executionMode: "production",
      failedProviderKind: "codex",
      failedProviderId: "codex",
      mockFallbackAllowed: false,
      fixtureFallbackAllowed: false,
      message:
        "Provider codex failed: Authenticated turn failed. Retry or use a manual recovery path.",
    });
  });
});
