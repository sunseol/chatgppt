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
});
