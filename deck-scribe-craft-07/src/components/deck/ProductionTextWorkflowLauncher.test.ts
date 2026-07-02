import { describe, expect, test } from "bun:test";
import { isCodexLoginVerified } from "./codex-settings-actions";
import { shouldRequestCodexConnectionBeforeRun } from "./ProductionTextWorkflowLauncher";

describe("production text workflow launcher Codex connection guard", () => {
  test("requires the connection modal before a live run when the bridge is missing", () => {
    expect(
      shouldRequestCodexConnectionBeforeRun({
        appServerBridge: "missing",
        codexLoginVerified: false,
      }),
    ).toBe(true);
  });

  test("requires the connection modal before a live run when Codex login is not verified", () => {
    expect(
      shouldRequestCodexConnectionBeforeRun({
        appServerBridge: "available",
        codexLoginVerified: false,
      }),
    ).toBe(true);
  });

  test("allows the live run only after the desktop bridge and Codex login are verified", () => {
    expect(
      shouldRequestCodexConnectionBeforeRun({
        appServerBridge: "available",
        codexLoginVerified: true,
      }),
    ).toBe(false);
  });

  test("treats only a successful completed Codex login status as verified", () => {
    expect(isCodexLoginVerified({ kind: "idle" })).toBe(false);
    expect(isCodexLoginVerified({ kind: "completed", success: false, output: "Login required" })).toBe(
      false,
    );
    expect(isCodexLoginVerified({ kind: "completed", success: true, output: "Logged in" })).toBe(
      true,
    );
  });
});
