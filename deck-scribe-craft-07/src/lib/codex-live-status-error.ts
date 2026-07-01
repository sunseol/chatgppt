import { redactSensitiveText } from "./redaction";
import { formatSupportedCodexRuntimeRange } from "./codex-runtime";
import type { CodexStatusActionError } from "./codex-live-status-types";

export function createCodexStatusActionError(input: {
  readonly code: string;
  readonly message: string;
}): CodexStatusActionError {
  const rawMessage = firstUsefulLine(input.message);
  if (input.code === "missing_bridge") {
    return {
      title: "앱 실행 통로를 찾을 수 없습니다",
      cause: "현재 화면에서 Tauri bridge가 감지되지 않았습니다.",
      action: "DMG/Tauri 앱으로 다시 열고 연결 및 실행 환경을 확인하세요.",
      retryLabel: "Bridge 다시 확인",
      rawMessage,
    };
  }

  if (isCliUnavailable(input.code, input.message)) {
    return {
      title: "Codex CLI를 찾을 수 없습니다",
      cause: "이 앱에서 Codex CLI 실행 파일을 찾지 못했습니다.",
      action: `지원 버전 ${formatSupportedCodexRuntimeRange()}의 Codex CLI를 설치하거나 Terminal에서 codex login status가 실행되는지 확인하세요.`,
      retryLabel: "상태 다시 확인",
      rawMessage,
    };
  }

  if (isAuthFailure(input.code, input.message)) {
    return {
      title: "Codex 로그인이 필요합니다",
      cause: "Codex 세션이 없거나 만료되어 app-server를 검증할 수 없습니다.",
      action: "로그인 열기를 눌러 Codex 로그인을 마친 뒤 상태를 다시 확인하세요.",
      retryLabel: "로그인 상태 다시 확인",
      rawMessage,
    };
  }

  return {
    title: "Codex 실행에 실패했습니다",
    cause: rawMessage,
    action: "연결 및 실행 환경에서 로그인 상태 확인과 app-server smoke를 다시 실행하세요.",
    retryLabel: "재시도",
    rawMessage,
  };
}

function isCliUnavailable(code: string, message: string): boolean {
  return (
    code === "codex_cli_unavailable" ||
    message.includes("ENOENT") ||
    message.includes("vendor/codex")
  );
}

function isAuthFailure(code: string, message: string): boolean {
  const lower = message.toLowerCase();
  return code.includes("auth") || lower.includes("login") || lower.includes("unauthorized");
}

function firstUsefulLine(message: string): string {
  const redacted = redactSensitiveText(message);
  return (
    redacted
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("at ")) ?? "Unknown Codex failure."
  );
}
