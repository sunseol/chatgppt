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
    expect(markup.includes("Provider codex")).toBe(false);
    expect(markup.includes("실행 codex")).toBe(true);
    expect(markup.includes("인증 Codex 세션")).toBe(true);
    expect(markup.includes("연결됨")).toBe(true);
    expect(markup.includes("텍스트 기획")).toBe(true);
    expect(markup.includes("조사 보조")).toBe(true);
    expect(markup.includes("이미지 생성")).toBe(true);
    expect(markup.includes("수정 생성")).toBe(true);
    expect(markup.includes("사용 가능")).toBe(true);
    expect(markup.includes("잠김")).toBe(true);
    expect(markup.includes("현재 연결된 provider에는 이미지 생성 기능이 없습니다.")).toBe(true);
    expect(markup.includes("OpenAI 이미지 fallback 설정")).toBe(true);
    expect(markup.includes("can create")).toBe(false);
    expect(markup.includes("current auth state")).toBe(false);
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

    expect(markup.includes("실행 codex")).toBe(true);
    expect(markup.includes("인증 Codex 세션")).toBe(true);
    expect(markup.includes("사용 불가")).toBe(true);
    expect(markup.includes("Codex App Server is not reachable.")).toBe(true);
    expect(markup.includes("연결 및 실행 환경에서 Codex 연결 상태를 확인하세요.")).toBe(true);
    expect(countOccurrences(markup, "Codex를 사용할 수 없습니다") <= 1).toBe(true);
    expect(markup.includes("Provider 상태 확인")).toBe(true);
    expect(markup.includes("사용 가능")).toBe(false);
  });

  test("renders bridge-detected provider state without claiming connected capabilities", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "bridgeDetected",
        providerId: "codex",
        message: "앱 실행 통로 확인됨. 실행 시 Codex 상태 확인이 필요합니다.",
      },
      capabilities: ["deckPlan", "research"],
    });

    const markup = renderToStaticMarkup(<ProviderCapabilityMatrix view={view} />);

    expect(markup.includes("Bridge 감지")).toBe(true);
    expect(markup.includes("앱 실행 통로 확인됨")).toBe(true);
    expect(markup.includes("실행 시 Codex 상태 확인")).toBe(true);
    expect(markup.includes("연결됨")).toBe(false);
    expect(markup.includes("사용 가능")).toBe(false);
    expect(markup.includes("Codex 상태 확인")).toBe(true);
  });
});

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
