import type {
  SettingsCodexLoginStatus,
  SettingsSmokeStatus,
} from "@/components/deck/HomeSettingsDialog";
import { runDesktopCodexAppServerSmoke } from "@/lib/desktop-app-server-bridge";
import {
  openDesktopCodexLoginTerminal,
  readDesktopCodexLoginStatus,
} from "@/lib/desktop-codex-login";

export function isCodexLoginVerified(status: SettingsCodexLoginStatus): boolean {
  return status.kind === "completed" && status.success;
}

export async function refreshCodexLoginStatus(
  setLoginStatus: (status: SettingsCodexLoginStatus) => void,
): Promise<void> {
  setLoginStatus({ kind: "running" });
  const result = await readDesktopCodexLoginStatus();
  switch (result.kind) {
    case "missing_bridge":
      setLoginStatus({ kind: "missing" });
      return;
    case "completed":
      setLoginStatus({
        kind: "completed",
        success: result.evidence.success,
        output: loginStatusOutput(result.evidence.stdout, result.evidence.stderr),
      });
      return;
    case "failed":
      setLoginStatus({ kind: "failed", message: result.error.message });
      return;
    default:
      return assertNever(result);
  }
}

export async function openCodexLoginTerminal(
  setLoginStatus: (status: SettingsCodexLoginStatus) => void,
): Promise<void> {
  setLoginStatus({ kind: "opening" });
  const result = await openDesktopCodexLoginTerminal();
  switch (result.kind) {
    case "missing_bridge":
      setLoginStatus({ kind: "missing" });
      return;
    case "opened":
      setLoginStatus({ kind: "opened", command: result.evidence.command });
      return;
    case "failed":
      setLoginStatus({ kind: "failed", message: result.error.message });
      return;
    default:
      return assertNever(result);
  }
}

export async function runSettingsSmoke(
  setSmokeStatus: (status: SettingsSmokeStatus) => void,
): Promise<void> {
  setSmokeStatus({ kind: "running" });
  const result = await runDesktopCodexAppServerSmoke();
  switch (result.kind) {
    case "missing_bridge":
      setSmokeStatus({ kind: "missing" });
      return;
    case "completed":
      setSmokeStatus({
        kind: "completed",
        threadId: result.evidence.threadId,
        turnId: result.evidence.turnId,
        accountType: result.evidence.accountType ?? "unknown",
      });
      return;
    case "failed":
      setSmokeStatus({ kind: "failed", message: result.error.message });
      return;
    default:
      return assertNever(result);
  }
}

function loginStatusOutput(stdout: string, stderr: string): string {
  const output = stdout.trim() || stderr.trim();
  return output || "Codex CLI 상태 출력이 비어 있습니다.";
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Codex settings action result: ${JSON.stringify(value)}`);
}
