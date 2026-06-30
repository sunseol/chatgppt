import { describe, expect, test } from "bun:test";
import { createCodexProviderStatus } from "./codex-provider";
import { SUPPORTED_CODEX_RUNTIME } from "./codex-runtime";

describe("Codex provider status", () => {
  test("requires auth when runtime is ready but login is absent", () => {
    const status = createCodexProviderStatus({
      runtime: {
        kind: "ready",
        executablePath: "/usr/local/bin/codex",
        version: "1.2.3",
        supportedRange: SUPPORTED_CODEX_RUNTIME,
        message: "Codex CLI 1.2.3 is available.",
      },
      auth: { kind: "loggedOut" },
    });

    expect(status).toEqual({
      kind: "requiresAuth",
      providerId: "codex",
      message: "Sign in with ChatGPT or complete the Codex device-code flow.",
    });
  });

  test("connects when runtime is ready and Codex login is present", () => {
    const status = createCodexProviderStatus({
      runtime: {
        kind: "ready",
        executablePath: "/usr/local/bin/codex",
        version: "1.2.3",
        supportedRange: SUPPORTED_CODEX_RUNTIME,
        message: "Codex CLI 1.2.3 is available.",
      },
      auth: { kind: "loggedIn", accountLabel: "workspace@example.com" },
    });

    expect(status).toEqual({
      kind: "connected",
      providerId: "codex",
      message: "Codex is connected as workspace@example.com.",
    });
  });

  test("stays unavailable when app-server bootstrap is not ready", () => {
    const status = createCodexProviderStatus({
      runtime: {
        kind: "ready",
        executablePath: "/usr/local/bin/codex",
        version: "1.2.3",
        supportedRange: SUPPORTED_CODEX_RUNTIME,
        message: "Codex CLI 1.2.3 is available.",
      },
      appServer: {
        kind: "standaloneInstallMissing",
        message: "Codex App Server cannot start because the managed standalone install is missing.",
        remediation:
          "Install the standalone Codex package with the official installer, then retry app-server daemon start.",
        retryable: true,
      },
      auth: { kind: "loggedIn", accountLabel: "workspace@example.com" },
    });

    expect(status).toEqual({
      kind: "unavailable",
      providerId: "codex",
      message:
        "Codex App Server cannot start because the managed standalone install is missing. Install the standalone Codex package with the official installer, then retry app-server daemon start.",
    });
  });

  test("stays unavailable when runtime discovery is not ready", () => {
    const status = createCodexProviderStatus({
      runtime: {
        kind: "missing",
        supportedRange: SUPPORTED_CODEX_RUNTIME,
        message: "Codex CLI was not found on this device.",
        remediation: "Install Codex CLI, then retry runtime discovery.",
      },
      auth: { kind: "unknown" },
    });

    expect(status).toEqual({
      kind: "unavailable",
      providerId: "codex",
      message:
        "Codex CLI was not found on this device. Install Codex CLI, then retry runtime discovery.",
    });
  });
});
