import { describe, expect, test } from "bun:test";
import { SUPPORTED_CODEX_RUNTIME, evaluateCodexRuntime } from "./codex-runtime";

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
