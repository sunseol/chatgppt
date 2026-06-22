import { describe, expect, test } from "bun:test";
import {
  createNewProjectProviderMatrixInput,
  selectImageGenerationProviderId,
} from "./provider-runtime-selection";

describe("provider runtime selection", () => {
  test("selects live provider status for new projects in production", () => {
    const input = createNewProjectProviderMatrixInput("production");

    expect(input.providerName).toBe("Codex");
    expect(input.status.providerId).toBe("codex");
    expect(input.status.kind).toBe("requiresAuth");
    expect(input.authMode).toBe("codex_session");
  });

  test("marks production Codex capabilities available when the app-server bridge is present", () => {
    const input = createNewProjectProviderMatrixInput("production", "available");

    expect(input.providerName).toBe("Codex");
    expect(input.status.providerId).toBe("codex");
    expect(input.status.kind).toBe("connected");
    expect(input.capabilities.includes("imageGeneration")).toBe(true);
    expect(input.capabilities.includes("editableLayers")).toBe(true);
  });

  test("keeps mock selection explicit outside production", () => {
    const input = createNewProjectProviderMatrixInput("development");

    expect(input.providerName).toBe("Mock Provider");
    expect(input.status.providerId).toBe("mock");
    expect(input.status.kind).toBe("connected");
  });

  test("selects a live image provider for production generation jobs", () => {
    expect(selectImageGenerationProviderId("production")).toBe("codex");
    expect(selectImageGenerationProviderId("development")).toBe("mock");
    expect(selectImageGenerationProviderId("test")).toBe("mock");
  });
});
