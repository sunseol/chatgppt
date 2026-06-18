import { describe, expect, test } from "bun:test";
import {
  evaluateCodexAppServerHealthTurn,
  evaluateCodexAppServerInitializeSmoke,
  evaluateCodexAppServerRestartSmoke,
} from "./codex-app-server-initialize-smoke";
import {
  SUPPORTED_CODEX_RUNTIME,
  evaluateCodexAppServerBootstrap,
  evaluateCodexRuntime,
} from "./codex-runtime";

describe("Codex runtime discovery", () => {
  test("returns install guidance when the runtime is missing", () => {
    const result = evaluateCodexRuntime({ kind: "missing" });

    expect(result).toEqual({
      kind: "missing",
      supportedRange: SUPPORTED_CODEX_RUNTIME,
      message: "Codex CLI was not found on this device.",
      remediation: "Install Codex CLI, then retry runtime discovery.",
    });
  });

  test("returns upgrade guidance when the runtime version is unsupported", () => {
    const result = evaluateCodexRuntime({
      kind: "found",
      executablePath: "/usr/local/bin/codex",
      version: "0.9.0",
      canExecute: true,
    });

    expect(result).toEqual({
      kind: "unsupportedVersion",
      executablePath: "/usr/local/bin/codex",
      version: "0.9.0",
      supportedRange: SUPPORTED_CODEX_RUNTIME,
      message: "Codex CLI 0.9.0 is outside the supported runtime range.",
      remediation: "Upgrade Codex CLI to a supported version, then retry.",
    });
  });

  test("returns ready metadata for a supported executable runtime", () => {
    const result = evaluateCodexRuntime({
      kind: "found",
      executablePath: "/usr/local/bin/codex",
      version: "1.2.3",
      canExecute: true,
    });

    expect(result).toEqual({
      kind: "ready",
      executablePath: "/usr/local/bin/codex",
      version: "1.2.3",
      supportedRange: SUPPORTED_CODEX_RUNTIME,
      message: "Codex CLI 1.2.3 is available.",
    });
  });
});

describe("Codex app-server bootstrap", () => {
  test("records a successful stdio initialize smoke separately from durable daemon state", () => {
    const result = evaluateCodexAppServerInitializeSmoke({
      kind: "initialized",
      transport: "stdio",
      cliVersion: "0.139.0",
      requestId: 1,
      response: {
        userAgent: "Codex Desktop/0.139.0 (Mac OS 26.5.1; arm64) dumb (deckforge-smoke; 0.1.0)",
        codexHome: "/Users/jake/.codex",
        platformFamily: "unix",
        platformOs: "macos",
      },
      stderrWarnings: [
        "app-server remote control websocket loop stopped before client name was ready",
      ],
    });

    expect(result).toEqual({
      kind: "ready",
      transport: "stdio",
      cliVersion: "0.139.0",
      requestId: 1,
      platformFamily: "unix",
      platformOs: "macos",
      userAgent: "Codex Desktop/0.139.0 (Mac OS 26.5.1; arm64) dumb (deckforge-smoke; 0.1.0)",
      warningCount: 1,
      message: "Codex App Server initialize succeeded over stdio.",
    });
  });

  test("reports standalone install remediation when daemon start cannot find the managed app-server", () => {
    const result = evaluateCodexAppServerBootstrap({
      kind: "startFailed",
      exitCode: 1,
      stderr:
        "Error: managed standalone Codex install not found at /Users/jake/.codex/packages/standalone/current/codex",
    });

    expect(result).toEqual({
      kind: "standaloneInstallMissing",
      message: "Codex App Server cannot start because the managed standalone install is missing.",
      remediation:
        "Install the standalone Codex package with the official installer, then retry app-server daemon start.",
      retryable: true,
    });
  });

  test("records an authenticated health turn with durable thread and turn provenance", () => {
    const result = evaluateCodexAppServerHealthTurn({
      kind: "completed",
      transport: "stdio",
      cliVersion: "0.141.0",
      account: {
        type: "chatgpt",
        requiresOpenaiAuth: true,
      },
      threadId: "019eda62-40ed-77c2-be18-3677896e947e",
      turnId: "019eda62-4304-7892-b07e-66b57d50c144",
      turnStatus: "completed",
    });

    expect(result).toEqual({
      kind: "ready",
      transport: "stdio",
      cliVersion: "0.141.0",
      accountType: "chatgpt",
      threadId: "019eda62-40ed-77c2-be18-3677896e947e",
      turnId: "019eda62-4304-7892-b07e-66b57d50c144",
      message: "Codex App Server authenticated health turn completed.",
    });
  });

  test("does not count an incomplete health turn as live-ready", () => {
    const result = evaluateCodexAppServerHealthTurn({
      kind: "failed",
      transport: "stdio",
      cliVersion: "0.141.0",
      account: {
        type: "chatgpt",
        requiresOpenaiAuth: true,
      },
      threadId: "019eda62-40ed-77c2-be18-3677896e947e",
      turnId: "019eda62-4304-7892-b07e-66b57d50c144",
      failureReason: "turn did not complete",
    });

    expect(result).toEqual({
      kind: "failed",
      transport: "stdio",
      cliVersion: "0.141.0",
      message: "Codex App Server authenticated health turn failed.",
      remediation: "Retry the health turn and inspect App Server turn errors.",
      retryable: true,
    });
  });

  test("records a daemon crash restart followed by a completed health turn", () => {
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
        threadId: "019eda6a-81a9-7db0-91d7-ec73d6c78880",
        turnId: "019eda6a-8419-7ab3-be96-ea93f517aa6f",
        turnStatus: "completed",
      },
    });

    expect(result).toEqual({
      kind: "ready",
      cliVersion: "0.141.0",
      appServerVersion: "0.141.0",
      oldPid: 97850,
      newPid: 5889,
      threadId: "019eda6a-81a9-7db0-91d7-ec73d6c78880",
      turnId: "019eda6a-8419-7ab3-be96-ea93f517aa6f",
      message: "Codex App Server restarted after crash and completed a health turn.",
    });
  });

  test("blocks restart evidence when the post-restart health turn failed", () => {
    const result = evaluateCodexAppServerRestartSmoke({
      kind: "restartFailed",
      cliVersion: "0.141.0",
      oldPid: 97850,
      crashProbeError: "failed to connect to app-server-control.sock: Connection refused",
      restartError: "daemon start failed",
    });

    expect(result).toEqual({
      kind: "failed",
      cliVersion: "0.141.0",
      message: "Codex App Server crash restart smoke failed.",
      remediation: "Restart the daemon and rerun an authenticated post-restart health turn.",
      retryable: true,
    });
  });
});
