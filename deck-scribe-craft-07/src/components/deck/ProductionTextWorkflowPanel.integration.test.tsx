import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionWorkflowStage } from "@/components/deck/ProductionWorkflowStage";
import type { DeckProject, InterviewBrief } from "@/lib/deck-types";
import { liveApprovedResearchPackFixture } from "@/lib/live-research-approval-test-fixtures";

describe("production text workflow panel", () => {
  test("shows the App Server interview workflow gate on the production interview step", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="interview" />,
    );

    // Then
    expect(markup.includes("Live interview App Server workflow")).toBe(true);
    expect(markup.includes("Run live interview turns")).toBe(true);
    expect(markup.includes("questions")).toBe(true);
    expect(markup.includes("brief")).toBe(true);
    expect(markup.includes("app_server_bridge_missing")).toBe(true);
  });

  test("enables the production interview action when the desktop bridge is available", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="interview" appServerBridge="available" />,
    );

    // Then
    expect(markup.includes("Run live interview turns")).toBe(true);
    expect(markup.includes("app_server_bridge_missing")).toBe(false);
    const buttonMarkup = markup.slice(
      Math.max(0, markup.indexOf("Run live interview turns") - 300),
      markup.indexOf("Run live interview turns") + 120,
    );
    expect(buttonMarkup.includes("disabled")).toBe(false);
  });

  test("shows production interview answer inputs before a live brief exists", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="interview" appServerBridge="available" />,
    );

    // Then
    expect(markup.includes("인터뷰 질문")).toBe(true);
    expect(markup.includes("이 덱의 목적은 무엇인가요?")).toBe(true);
    expect(markup.includes("주요 청중은 누구인가요?")).toBe(true);
    expect(markup.includes("덱 전체를 관통하는 핵심 메시지는 무엇인가요?")).toBe(true);
    expect(markup.includes("원하는 슬라이드 수는 몇 장인가요?")).toBe(true);
  });

  test("shows upstream blockers before the production text pipeline can run", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(<ProductionWorkflowStage project={project} step="plan" />);

    // Then
    expect(markup.includes("Live Plan/Design/Layout App Server workflow")).toBe(true);
    expect(markup.includes("deck_plan")).toBe(true);
    expect(markup.includes("design_system")).toBe(true);
    expect(markup.includes("layout_ir")).toBe(true);
    expect(markup.includes("missing_live_brief")).toBe(true);
    expect(markup.includes("missing_approved_research")).toBe(true);
  });

  test("shows a runnable text pipeline action when prerequisites and bridge are available", () => {
    // Given
    const project = projectFixture({
      brief: briefFixture(),
      research: liveApprovedResearchPackFixture(),
      stage: "PLANNING",
    });

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="layout" appServerBridge="available" />,
    );

    // Then
    expect(markup.includes("Run live text pipeline")).toBe(true);
    expect(markup.includes("Ready to launch")).toBe(true);
    expect(markup.includes("patch targets: plan, design, layout")).toBe(true);
    expect(markup.includes("missing_live_brief")).toBe(false);
    expect(markup.includes("app_server_bridge_missing")).toBe(false);
  });
});

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_live_text_panel",
    name: "Live Text Panel",
    initialPrompt: "임원 보고 덱",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "PROJECT_CREATED",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function briefFixture(): InterviewBrief {
  return {
    id: "brief_live_panel",
    goal: "분기 성과 공유",
    audience: "임원",
    desiredOutcome: "예산 승인",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["정확한"],
    mustInclude: ["핵심 지표"],
    mustAvoid: ["출처 없는 수치"],
    successCriteria: ["의사결정 가능"],
    openQuestions: [],
    approvedHash: "hash_brief_live",
  };
}
