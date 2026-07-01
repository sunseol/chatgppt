import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionWorkflowStage } from "@/components/deck/ProductionWorkflowStage";
import type { DeckProject, InterviewBrief } from "@/lib/deck-types";

describe("production research web search launcher", () => {
  test("shows launch blockers and enables the action when prerequisites are ready", () => {
    // Given
    const blockedProject = projectFixture();
    const readyProject = projectFixture({ brief: briefFixture() });

    // When
    const blockedMarkup = renderToStaticMarkup(
      <ProductionWorkflowStage project={blockedProject} step="research" />,
    );
    const readyMarkup = renderToStaticMarkup(
      <ProductionWorkflowStage
        project={readyProject}
        step="research"
        appServerBridge="available"
      />,
    );

    // Then
    expect(blockedMarkup.includes("실제 조사 실행")).toBe(true);
    expect(blockedMarkup.includes("missing_live_brief")).toBe(true);
    expect(blockedMarkup.includes("app_server_bridge_missing")).toBe(true);
    expect(readyMarkup.includes("조사팩 생성 시작")).toBe(true);
    expect(readyMarkup.includes("Live Research Pack workflow")).toBe(false);
    expect(readyMarkup.includes("missing_live_brief")).toBe(false);
    expect(researchPackButtonMarkup(readyMarkup).includes(' disabled=""')).toBe(false);
  });
});

function researchPackButtonMarkup(markup: string): string {
  const labelIndex = markup.indexOf("조사팩 생성 시작");
  const buttonStart = markup.lastIndexOf("<button", labelIndex);
  const buttonEnd = markup.indexOf("</button>", labelIndex);
  return markup.slice(buttonStart, buttonEnd);
}

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_live_research_search",
    name: "Live Research Search",
    initialPrompt: "시장 조사 덱",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "RESEARCHING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function briefFixture(): InterviewBrief {
  return {
    id: "brief_live_research",
    goal: "시장 현황 조사",
    audience: "임원",
    desiredOutcome: "투자 우선순위 결정",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["정확한"],
    mustInclude: ["공식 통계"],
    mustAvoid: ["출처 없는 수치"],
    successCriteria: ["세 도메인 이상"],
    openQuestions: [],
    approvedHash: "sha256:brief",
  };
}
