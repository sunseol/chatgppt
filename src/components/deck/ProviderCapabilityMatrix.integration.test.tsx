import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProviderCapabilityMatrix } from "./ProviderCapabilityMatrix";
import { createProviderCapabilityMatrixView } from "@/lib/provider-capability-view";

describe("provider capability matrix UI", () => {
  test("renders available and locked provider features with remediation", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      status: {
        kind: "connected",
        providerId: "codex",
        message: "Codex connected",
      },
      capabilities: ["deckPlan", "research"],
    });

    const markup = renderToStaticMarkup(<ProviderCapabilityMatrix view={view} />);

    expect(markup.includes("Provider 기능 매트릭스")).toBe(true);
    expect(markup.includes("텍스트 기획")).toBe(true);
    expect(markup.includes("조사 보조")).toBe(true);
    expect(markup.includes("이미지 생성")).toBe(true);
    expect(markup.includes("수정 생성")).toBe(true);
    expect(markup.includes("사용 가능")).toBe(true);
    expect(markup.includes("잠김")).toBe(true);
    expect(markup.includes("Connected provider does not expose image generation.")).toBe(true);
    expect(markup.includes("OpenAI 이미지 fallback 설정")).toBe(true);
  });
});
