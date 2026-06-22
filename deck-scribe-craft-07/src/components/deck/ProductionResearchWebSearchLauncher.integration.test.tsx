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
    expect(blockedMarkup.includes("Live web search Research workflow")).toBe(true);
    expect(blockedMarkup.includes("missing_live_brief")).toBe(true);
    expect(blockedMarkup.includes("app_server_bridge_missing")).toBe(true);
    expect(readyMarkup.includes("Run live web search")).toBe(true);
    expect(readyMarkup.includes("missing_live_brief")).toBe(false);
    expect(webSearchButtonMarkup(readyMarkup).includes(' disabled=""')).toBe(false);
  });
});

function webSearchButtonMarkup(markup: string): string {
  const labelIndex = markup.indexOf("Run live web search");
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
