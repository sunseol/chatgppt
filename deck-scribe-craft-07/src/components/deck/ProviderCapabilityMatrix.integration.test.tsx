import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProviderCapabilityMatrix } from "./ProviderCapabilityMatrix";
import { createProviderCapabilityMatrixView } from "@/lib/provider-capability-view";

describe("provider capability matrix UI", () => {
  test("renders available and locked provider features with remediation", () => {
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

    const markup = renderToStaticMarkup(<ProviderCapabilityMatrix view={view} />);

    expect(markup.includes("Provider 기능 매트릭스")).toBe(true);
    expect(markup.includes("Provider codex")).toBe(true);
    expect(markup.includes("Auth Codex session")).toBe(true);
    expect(markup.includes("Connected")).toBe(true);
    expect(markup.includes("텍스트 기획")).toBe(true);
    expect(markup.includes("조사 보조")).toBe(true);
    expect(markup.includes("이미지 생성")).toBe(true);
    expect(markup.includes("수정 생성")).toBe(true);
    expect(markup.includes("사용 가능")).toBe(true);
    expect(markup.includes("잠김")).toBe(true);
    expect(markup.includes("Connected provider does not expose image generation.")).toBe(true);
    expect(markup.includes("Codex 이미지 생성 확인")).toBe(true);
  });

  test("renders unavailable provider state with locked remediation", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "unavailable",
        providerId: "codex",
        message: "Codex App Server is not reachable.",
      },
      capabilities: ["deckPlan", "research", "imageGeneration", "editableLayers"],
    });

    const markup = renderToStaticMarkup(<ProviderCapabilityMatrix view={view} />);

    expect(markup.includes("Provider codex")).toBe(true);
    expect(markup.includes("Auth Codex session")).toBe(true);
    expect(markup.includes("Unavailable")).toBe(true);
    expect(markup.includes("Codex App Server is not reachable.")).toBe(true);
    expect(markup.includes("Codex is unavailable: Codex App Server is not reachable.")).toBe(true);
    expect(markup.includes("Provider 상태 확인")).toBe(true);
    expect(markup.includes("사용 가능")).toBe(false);
  });
});
