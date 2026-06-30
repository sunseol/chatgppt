import { describe, expect, test } from "bun:test";
import { createClientNewProjectProviderMatrixInput } from "./client-provider-runtime-selection";

describe("client provider runtime selection", () => {
  test("requires desktop Codex bridge before presenting live readiness in browser development", () => {
    const input = createClientNewProjectProviderMatrixInput({
      isProductionBuild: false,
      appServerBridge: "missing",
    });

    expect(input.providerName).toBe("Codex");
    expect(input.status.providerId).toBe("codex");
    expect(input.status.kind).toBe("unavailable");
    expect(input.capabilities).toEqual([]);
    expect(input.status.message.includes("브라우저 개발 서버")).toBe(true);
  });

  test("presents desktop bridge detection without claiming verified login", () => {
    const input = createClientNewProjectProviderMatrixInput({
      isProductionBuild: false,
      appServerBridge: "available",
    });

    expect(input.providerName).toBe("Codex");
    expect(input.status.providerId).toBe("codex");
    expect(input.status.kind).toBe("bridgeDetected");
    expect(input.status.message.includes("앱 실행 통로 확인됨")).toBe(true);
    expect(input.status.message.includes("실행 시 Codex 상태 확인")).toBe(true);
    expect(input.capabilities.includes("interview")).toBe(true);
    expect(input.capabilities.includes("research")).toBe(true);
  });
});
