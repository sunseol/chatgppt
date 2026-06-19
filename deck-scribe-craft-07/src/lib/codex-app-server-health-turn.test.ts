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
});
