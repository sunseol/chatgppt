import { describe, expect, test } from "bun:test";
import { createProviderCapabilityMatrixView } from "./provider-capability-view";
import { ProviderCapabilities } from "./provider-types";

describe("provider capability matrix view", () => {
  test("summarizes selected provider, auth mode, and live readiness states", () => {
    const needsLogin = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "requiresAuth",
        providerId: "codex",
        message: "Sign in with ChatGPT or complete the Codex device-code flow.",
      },
      capabilities: [],
    });
    const needsApiKey = createProviderCapabilityMatrixView({
      providerName: "OpenAI Image",
      authMode: "api_key",
      status: {
        kind: "needsApiKey",
        providerId: "openaiImage",
        message: "OpenAI image fallback requires a session API key.",
      },
      capabilities: ["imageGeneration"],
    });
    const liveTestFailed = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "liveTestFailed",
        providerId: "codex",
        message: "Authenticated health turn failed.",
      },
      capabilities: ProviderCapabilities,
    });
    const unavailable = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "unavailable",
        providerId: "codex",
        message: "Codex App Server is not reachable.",
      },
      capabilities: ProviderCapabilities,
    });
    const bridgeDetected = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "bridgeDetected",
        providerId: "codex",
        message: "데스크톱 bridge는 감지됐습니다.",
      },
      capabilities: ["deckPlan", "research"],
    });

    expect(needsLogin.selectedProviderId).toBe("codex");
    expect(needsLogin.authModeLabel).toBe("Codex 세션");
    expect(needsLogin.statusLabel).toBe("로그인 필요");
    expect(needsLogin.isLiveReady).toBe(false);
    expect(bridgeDetected.statusLabel).toBe("Bridge 감지");
    expect(bridgeDetected.isLiveReady).toBe(false);
    expect(bridgeDetected.rows.every((row) => row.status === "locked")).toBe(true);
    expect(bridgeDetected.rows[0]?.reason.includes("앱 실행 통로만 확인됨")).toBe(true);
    expect(needsApiKey.statusLabel).toBe("API Key 필요");
    expect(needsApiKey.authModeLabel).toBe("API Key");
    expect(liveTestFailed.statusLabel).toBe("라이브 테스트 실패");
    expect(liveTestFailed.rows.every((row) => row.status === "locked")).toBe(true);
    expect(unavailable.statusLabel).toBe("사용 불가");
    expect(unavailable.rows.every((row) => row.status === "locked")).toBe(true);
  });

  test("marks core planning and research available while image features are locked", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "connected",
        providerId: "codex",
        message: "Codex connected",
      },
      capabilities: ["deckPlan", "research"],
    });

    expect(view.rows).toEqual([
      {
        key: "text_planning",
        label: "텍스트 기획",
        status: "available",
        stateLabel: "사용 가능",
        reason: "Codex에서 텍스트 기획을 생성할 수 있습니다.",
        actionLabel: "현재 설정으로 사용 가능",
      },
      {
        key: "research_assist",
        label: "조사 보조",
        status: "available",
        stateLabel: "사용 가능",
        reason: "Codex에서 조사팩을 생성할 수 있습니다.",
        actionLabel: "현재 설정으로 사용 가능",
      },
      {
        key: "image_generation",
        label: "이미지 생성",
        status: "locked",
        stateLabel: "잠김",
        reason: "현재 연결된 provider에는 이미지 생성 기능이 없습니다.",
        actionLabel: "OpenAI 이미지 fallback 설정",
      },
      {
        key: "revision_generation",
        label: "수정 생성",
        status: "locked",
        stateLabel: "잠김",
        reason: "수정 생성을 사용하려면 이미지 생성 기능이 먼저 필요합니다.",
        actionLabel: "이미지 생성 잠금 해제",
      },
    ]);
  });

  test("shows API key remediation for OpenAI image fallback without credentials", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "connected",
        providerId: "codex",
        message: "Codex connected",
      },
      capabilities: ["deckPlan", "research", "editableLayers"],
      imageFallback: {
        providerId: "openaiImage",
        authMode: "openaiApiKey",
        targetModel: "gpt-image-2",
        setup: "requiresApiCredential",
        fallbackMode: true,
        credentialState: "missing",
        connectionCopy: "Image generation uses a separate OpenAI API credential.",
        billingCopy: "Image usage may be billed to the API organization.",
        permissionCopy: "Some image models may require organization verification.",
      },
    });

    expect(view.rows).toEqual([
      {
        key: "text_planning",
        label: "텍스트 기획",
        status: "available",
        stateLabel: "사용 가능",
        reason: "Codex에서 텍스트 기획을 생성할 수 있습니다.",
        actionLabel: "현재 설정으로 사용 가능",
      },
      {
        key: "research_assist",
        label: "조사 보조",
        status: "available",
        stateLabel: "사용 가능",
        reason: "Codex에서 조사팩을 생성할 수 있습니다.",
        actionLabel: "현재 설정으로 사용 가능",
      },
      {
        key: "image_generation",
        label: "이미지 생성",
        status: "locked",
        stateLabel: "잠김",
        reason: "OpenAI 이미지 fallback을 사용하려면 세션 API Key가 필요합니다.",
        actionLabel: "세션 API Key 입력",
      },
      {
        key: "revision_generation",
        label: "수정 생성",
        status: "locked",
        stateLabel: "잠김",
        reason: "수정 생성을 사용하려면 이미지 생성 기능이 먼저 필요합니다.",
        actionLabel: "이미지 생성 잠금 해제",
      },
    ]);
  });
});
