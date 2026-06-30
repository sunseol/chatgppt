import { describe, expect, test } from "bun:test";
import {
  createCodexLiveStatusView,
  createCodexProviderStatus,
  createCodexStatusActionError,
} from "./codex-live-status";

describe("codex live status view", () => {
  test("keeps bridge detection separate from verified connection", () => {
    // Given
    const view = createCodexLiveStatusView({
      bridge: "available",
      login: { kind: "idle" },
      smoke: { kind: "idle" },
      workflow: { kind: "idle" },
    });

    // When
    const providerStatus = createCodexProviderStatus(view);

    // Then
    expect(view.kind).toBe("bridge_detected");
    expect(view.label).toBe("Bridge 감지");
    expect(view.summary).toBe("앱 실행 통로 확인됨");
    expect(view.detail.includes("실행 시 Codex 상태 확인")).toBe(true);
    expect(view.isVerified).toBe(false);
    expect(view.canAttemptWorkflow).toBe(true);
    expect(providerStatus.kind).toBe("bridgeDetected");
    expect(providerStatus.message.includes("연결됨")).toBe(false);
  });

  test("uses verified only after login and app-server smoke both pass", () => {
    // Given
    const view = createCodexLiveStatusView({
      bridge: "available",
      login: { kind: "completed", success: true, output: "Logged in using ChatGPT" },
      smoke: {
        kind: "completed",
        accountType: "chatgpt",
        threadId: "thread_live",
        turnId: "turn_live",
      },
      workflow: { kind: "idle" },
    });

    // When
    const providerStatus = createCodexProviderStatus(view);

    // Then
    expect(view.kind).toBe("verified");
    expect(view.label).toBe("검증됨");
    expect(view.summary.includes("Codex 연결됨")).toBe(true);
    expect(view.detail.includes("로그인")).toBe(true);
    expect(view.detail.includes("app-server smoke")).toBe(true);
    expect(view.isVerified).toBe(true);
    expect(providerStatus.kind).toBe("connected");
    expect(providerStatus.message.includes("Codex 연결됨")).toBe(true);
  });

  test("turns an unsuccessful login status into login-required guidance", () => {
    // Given
    const view = createCodexLiveStatusView({
      bridge: "available",
      login: { kind: "completed", success: false, output: "Not logged in" },
      smoke: { kind: "idle" },
      workflow: { kind: "idle" },
    });

    // When
    const providerStatus = createCodexProviderStatus(view);

    // Then
    expect(view.kind).toBe("login_required");
    expect(view.label).toBe("로그인 필요");
    expect(view.actionLabel).toBe("Codex 로그인 열기");
    expect(providerStatus.kind).toBe("requiresAuth");
    expect(providerStatus.message.includes("Codex 로그인이 필요합니다")).toBe(true);
  });

  test("gives running workflows explicit stages and cancel affordance", () => {
    // Given
    const view = createCodexLiveStatusView({
      bridge: "available",
      login: { kind: "completed", success: true, output: "Logged in using ChatGPT" },
      smoke: {
        kind: "completed",
        accountType: "chatgpt",
        threadId: "thread_live",
        turnId: "turn_live",
      },
      workflow: {
        kind: "running",
        message: "라이브 인터뷰 질문을 생성하는 중입니다.",
        currentStep: "인터뷰 질문",
        expectedSteps: ["로그인 확인", "app-server smoke", "인터뷰 질문", "브리프 생성"],
        cancelRequested: false,
      },
    });

    // Then
    expect(view.kind).toBe("running");
    expect(view.label).toBe("실행 중");
    expect(view.detail.includes("예상 단계")).toBe(true);
    expect(view.detail.includes("인터뷰 질문")).toBe(true);
    expect(view.canCancel).toBe(true);
  });

  test("converts raw failures into cause action retry copy", () => {
    // Given
    const error = createCodexStatusActionError({
      code: "codex_cli_unavailable",
      message: "spawn /missing/vendor/codex ENOENT\n at internal.ts token=sk-secret123",
    });

    // Then
    expect(error.title).toBe("Codex CLI를 찾을 수 없습니다");
    expect(error.cause.includes("Codex CLI 실행 파일")).toBe(true);
    expect(error.action.includes("Codex CLI")).toBe(true);
    expect(error.action.includes("지원 버전 1.0.0 이상 2.0.0 미만")).toBe(true);
    expect(error.retryLabel).toBe("상태 다시 확인");
    expect(error.rawMessage.includes("sk-secret")).toBe(false);
  });
});
