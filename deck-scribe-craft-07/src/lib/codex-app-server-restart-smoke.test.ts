import { describe, expect, test } from "bun:test";
import { evaluateCodexAppServerRestartSmoke } from "./codex-app-server-initialize-smoke";

describe("Codex app-server restart smoke evidence", () => {
  test("blocks restart evidence that reuses the pre-restart health turn", () => {
    const preRestartHealthTurn = {
      kind: "completed" as const,
      transport: "stdio" as const,
      cliVersion: "0.141.0",
      account: {
        type: "chatgpt" as const,
        requiresOpenaiAuth: true,
      },
      threadId: "019eda6a-81a9-7db0-91d7-ec73d6c78880",
      turnId: "019eda6a-8419-7ab3-be96-ea93f517aa6f",
      turnStatus: "completed" as const,
    };

    const restartEvidence = {
      kind: "restarted" as const,
      cliVersion: "0.141.0",
      appServerVersion: "0.141.0",
      oldPid: 97850,
      newPid: 5889,
      crashProbeError: "failed to connect to app-server-control.sock: Connection refused",
      preRestartHealthTurn,
      postRestartHealthTurn: preRestartHealthTurn,
    };

    // Given / When
    const result = evaluateCodexAppServerRestartSmoke(restartEvidence);

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.message).toBe("Codex App Server crash restart smoke failed.");
  });

  test("blocks restart evidence with padded reused turns or app-server version drift", () => {
    const preRestartHealthTurn = {
      kind: "completed" as const,
      transport: "stdio" as const,
      cliVersion: "0.141.0",
      account: {
        type: "chatgpt" as const,
        requiresOpenaiAuth: true,
      },
      threadId: "thread_before_restart",
      turnId: "turn_before_restart",
      turnStatus: "completed" as const,
    };
    const restartEvidence = {
      kind: "restarted" as const,
      cliVersion: "0.141.0",
      appServerVersion: "0.141.0",
      oldPid: 97850,
      newPid: 5889,
      crashProbeError: "failed to connect to app-server-control.sock: Connection refused",
      preRestartHealthTurn,
      postRestartHealthTurn: {
        ...preRestartHealthTurn,
        threadId: " thread_before_restart ",
        turnId: " turn_before_restart ",
      },
    };

    const paddedReuse = evaluateCodexAppServerRestartSmoke(restartEvidence);
    const blankAppServerVersion = evaluateCodexAppServerRestartSmoke({
      ...restartEvidence,
      preRestartHealthTurn: undefined,
      postRestartHealthTurn: { ...preRestartHealthTurn, threadId: "thread_after_restart" },
      appServerVersion: " ",
    });
    const mismatchedAppServerVersion = evaluateCodexAppServerRestartSmoke({
      ...restartEvidence,
      preRestartHealthTurn: undefined,
      postRestartHealthTurn: { ...preRestartHealthTurn, threadId: "thread_after_restart" },
      appServerVersion: "0.140.0",
    });

    expect([paddedReuse.kind, blankAppServerVersion.kind, mismatchedAppServerVersion.kind]).toEqual(
      ["failed", "failed", "failed"],
    );
  });

  test("blocks post-restart health turns with non-canonical durable ids", () => {
    const result = evaluateCodexAppServerRestartSmoke({
      kind: "restarted",
      cliVersion: "0.141.0",
      appServerVersion: "0.141.0",
      oldPid: 97850,
      newPid: 5889,
      crashProbeError: "failed to connect to app-server-control.sock: Connection refused",
      postRestartHealthTurn: {
        kind: "completed",
        transport: "stdio",
        cliVersion: "0.141.0",
        account: {
          type: "chatgpt",
          requiresOpenaiAuth: true,
        },
        threadId: " thread_after_restart ",
        turnId: " turn_after_restart ",
        turnStatus: "completed",
      },
    });

    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.message).toBe("Codex App Server crash restart smoke failed.");
  });
});
