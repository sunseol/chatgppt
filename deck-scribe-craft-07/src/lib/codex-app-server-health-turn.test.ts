import { describe, expect, test } from "bun:test";
import { evaluateCodexAppServerHealthTurn } from "./codex-app-server-initialize-smoke";

describe("Codex app-server health turn evidence", () => {
  test("blocks completed health turns without durable thread or turn ids", () => {
    const completedHealthTurn = {
      kind: "completed" as const,
      transport: "stdio" as const,
      cliVersion: "0.141.0",
      account: {
        type: "chatgpt" as const,
        requiresOpenaiAuth: true,
      },
      threadId: "thread_live",
      turnId: "turn_live",
      turnStatus: "completed" as const,
    };

    const results = [
      evaluateCodexAppServerHealthTurn({ ...completedHealthTurn, threadId: " " }),
      evaluateCodexAppServerHealthTurn({ ...completedHealthTurn, turnId: "" }),
    ];

    expect(results.every((result) => result.kind === "failed")).toBe(true);
    expect(results.map((result) => result.message)).toEqual([
      "Codex App Server authenticated health turn failed.",
      "Codex App Server authenticated health turn failed.",
    ]);
  });

  test("blocks completed health turns with non-canonical durable ids", () => {
    const result = evaluateCodexAppServerHealthTurn({
      kind: "completed",
      transport: "stdio",
      cliVersion: "0.141.0",
      account: {
        type: "chatgpt",
        requiresOpenaiAuth: true,
      },
      threadId: " thread_live ",
      turnId: " turn_live ",
      turnStatus: "completed",
    });

    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.message).toBe("Codex App Server authenticated health turn failed.");
  });
});
