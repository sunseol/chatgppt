import { describe, expect, test } from "bun:test";
import { evaluateCodexAppServerInitializeSmoke } from "./codex-app-server-initialize-smoke";

describe("Codex app-server initialize evidence", () => {
  test("blocks initialized evidence with missing protocol identity fields", () => {
    // Given
    const result = evaluateCodexAppServerInitializeSmoke({
      kind: "initialized",
      transport: "stdio",
      cliVersion: " ",
      requestId: 0,
      response: {
        userAgent: "",
        codexHome: "",
        platformFamily: "",
        platformOs: "",
      },
      stderrWarnings: [],
    });

    // When / Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.message).toBe("Codex App Server initialize smoke failed.");
  });

  test("blocks initialized evidence when stderr contains protocol frames", () => {
    // Given
    const result = evaluateCodexAppServerInitializeSmoke({
      kind: "initialized",
      transport: "stdio",
      cliVersion: "0.141.0",
      requestId: 1,
      response: {
        userAgent: "Codex Desktop/0.141.0",
        codexHome: "/Users/jake/.codex",
        platformFamily: "unix",
        platformOs: "macos",
      },
      stderrWarnings: ['{"jsonrpc":"2.0","id":1,"result":{"ok":true}}'],
    });

    // When / Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.message).toBe("Codex App Server initialize smoke failed.");
  });
});
