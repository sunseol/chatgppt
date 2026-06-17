import { describe, expect, test } from "bun:test";
import { createProviderCapabilityMatrixView } from "./provider-capability-view";

describe("provider capability matrix view", () => {
  test("marks core planning and research available while image features are locked", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
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
        actionLabel: "OpenAI 이미지 fallback 설정",
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

  test("shows API key remediation for OpenAI image fallback without credentials", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
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
        reason: "OpenAI image fallback requires a session API key.",
        actionLabel: "세션 API Key 입력",
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
