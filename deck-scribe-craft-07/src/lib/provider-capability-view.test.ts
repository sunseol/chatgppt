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

    expect(needsLogin.selectedProviderId).toBe("codex");
    expect(needsLogin.authModeLabel).toBe("Codex session");
    expect(needsLogin.statusLabel).toBe("Needs Login");
    expect(needsApiKey.statusLabel).toBe("Needs API Key");
    expect(needsApiKey.authModeLabel).toBe("API key");
    expect(liveTestFailed.statusLabel).toBe("Live Test Failed");
    expect(liveTestFailed.rows.every((row) => row.status === "locked")).toBe(true);
    expect(unavailable.statusLabel).toBe("Unavailable");
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
        reason: "Codex can create deck plans in the current auth state.",
        actionLabel: "현재 설정으로 사용 가능",
      },
      {
        key: "research_assist",
        label: "조사 보조",
        status: "available",
        stateLabel: "사용 가능",
        reason: "Codex can create research packs in the current auth state.",
        actionLabel: "현재 설정으로 사용 가능",
      },
      {
        key: "image_generation",
        label: "이미지 생성",
        status: "locked",
        stateLabel: "잠김",
        reason: "Connected provider does not expose image generation.",
        actionLabel: "Codex 이미지 생성 확인",
      },
      {
        key: "revision_generation",
        label: "수정 생성",
        status: "locked",
        stateLabel: "잠김",
        reason: "Image generation must be available before revision generation.",
        actionLabel: "이미지 생성 잠금 해제",
      },
    ]);
  });

  test("does not show API key remediation when Codex image generation is pending", () => {
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
        providerId: "codex",
        authMode: "codexOAuth",
        targetModel: "gpt-image-2",
        setup: "requiresCodexImageCapability",
        fallbackMode: false,
        credentialState: "missing",
        connectionCopy: "Image generation uses the connected Codex OAuth session.",
        billingCopy: "Image usage follows the signed-in Codex account.",
        permissionCopy: "Codex image generation must be enabled for this runtime.",
      },
    });

    expect(view.rows).toEqual([
      {
        key: "text_planning",
        label: "텍스트 기획",
        status: "available",
        stateLabel: "사용 가능",
        reason: "Codex can create deck plans in the current auth state.",
        actionLabel: "현재 설정으로 사용 가능",
      },
      {
        key: "research_assist",
        label: "조사 보조",
        status: "available",
        stateLabel: "사용 가능",
        reason: "Codex can create research packs in the current auth state.",
        actionLabel: "현재 설정으로 사용 가능",
      },
      {
        key: "image_generation",
        label: "이미지 생성",
        status: "locked",
        stateLabel: "잠김",
        reason: "Codex image generation must be confirmed for this runtime.",
        actionLabel: "Codex 이미지 생성 확인",
      },
      {
        key: "revision_generation",
        label: "수정 생성",
        status: "locked",
        stateLabel: "잠김",
        reason: "Image generation must be available before revision generation.",
        actionLabel: "이미지 생성 잠금 해제",
      },
    ]);
  });
});
