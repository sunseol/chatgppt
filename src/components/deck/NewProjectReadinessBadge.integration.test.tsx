import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProviderReadinessBadge } from "./NewProjectForm";
import { createProviderCapabilityMatrixView } from "@/lib/provider-capability-view";

describe("new project provider readiness badge", () => {
  test("summarizes connected provider readiness without rendering the full matrix", () => {
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

    const markup = renderToStaticMarkup(<ProviderReadinessBadge view={view} />);

    expect(markup.includes("실행 준비 상태")).toBe(true);
    expect(markup.includes("Codex")).toBe(true);
    expect(markup.includes("라이브 연결됨")).toBe(true);
    expect(markup.includes("라이브 실행 가능")).toBe(true);
    expect(markup.includes("연결 및 실행 환경")).toBe(true);
    expect(markup.includes("Provider 기능 매트릭스")).toBe(false);
  });

  test("summarizes unavailable provider readiness with a settings recovery hint", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "unavailable",
        providerId: "codex",
        message: "Codex App Server is not reachable.",
      },
      capabilities: ["deckPlan", "research"],
    });

    const markup = renderToStaticMarkup(<ProviderReadinessBadge view={view} />);

    expect(markup.includes("실행 준비 상태")).toBe(true);
    expect(markup.includes("라이브 연결 필요")).toBe(true);
    expect(markup.includes("Codex App Server is not reachable.")).toBe(true);
    expect(markup.includes("연결 및 실행 환경")).toBe(true);
    expect(markup.includes("모든 기능 사용 가능")).toBe(false);
    expect(markup.includes("Connected")).toBe(false);
  });

  test("renders an actionable connection settings button when a handler is provided", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "unavailable",
        providerId: "codex",
        message: "Codex App Server is not reachable.",
      },
      capabilities: ["deckPlan", "research"],
    });

    const markup = renderToStaticMarkup(
      <ProviderReadinessBadge view={view} onOpenConnectionSettings={() => undefined} />,
    );

    expect(markup.includes("button")).toBe(true);
    expect(markup.includes("Codex 상태 확인")).toBe(true);
    expect(markup.includes('type="button"')).toBe(true);
  });

  test("describes bridge-detected readiness without claiming a verified login", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "bridgeDetected",
        providerId: "codex",
        message: "데스크톱 bridge는 감지됐습니다.",
      },
      capabilities: ["deckPlan", "research"],
    });

    const markup = renderToStaticMarkup(<ProviderReadinessBadge view={view} />);

    expect(markup.includes("Bridge 감지")).toBe(true);
    expect(markup.includes("앱 실행 통로 확인됨")).toBe(true);
    expect(markup.includes("실행 시 Codex 상태 확인")).toBe(true);
    expect(markup.includes("라이브 실행 가능")).toBe(false);
    expect(markup.includes("라이브 연결됨")).toBe(false);
    expect(markup.includes("로그인 필요")).toBe(false);
  });

  test("does not present browser mock mode as a connected live provider", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "unavailable",
        providerId: "codex",
        message: "브라우저 개발 서버에는 데스크톱 Codex 브리지가 없습니다.",
      },
      capabilities: [],
    });

    const markup = renderToStaticMarkup(<ProviderReadinessBadge view={view} />);

    expect(markup.includes("Mock Provider")).toBe(false);
    expect(markup.includes("라이브 전환 필요")).toBe(true);
    expect(markup.includes("모든 기능 사용 가능")).toBe(false);
  });

  test("uses the exact GPPT settings recovery control label", () => {
    const view = createProviderCapabilityMatrixView({
      providerName: "Codex",
      authMode: "codex_session",
      status: {
        kind: "unavailable",
        providerId: "codex",
        message: "Codex App Server is not reachable.",
      },
      capabilities: ["deckPlan", "research"],
    });

    const markup = renderToStaticMarkup(
      <ProviderReadinessBadge view={view} onOpenConnectionSettings={() => undefined} />,
    );

    expect(markup.includes("Codex 상태 확인")).toBe(true);
    expect(markup.includes("연결 및 실행 환경 열기")).toBe(false);
  });
});
