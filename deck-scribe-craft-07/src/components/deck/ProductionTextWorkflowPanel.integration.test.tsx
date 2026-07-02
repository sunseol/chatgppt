import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionWorkflowStage } from "@/components/deck/ProductionWorkflowStage";
import { createCodexStatusActionError } from "@/lib/codex-live-status";
import type { DeckProject, InterviewBrief, ResearchPack } from "@/lib/deck-types";

describe("production text workflow panel", () => {
  test("shows the live interview workflow gate on the production interview step", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="interview" />,
    );

    // Then
    expect(markup.includes("라이브 인터뷰 실행")).toBe(true);
    expect(markup.includes("인터뷰 질문")).toBe(true);
    expect(markup.includes("브리프 생성")).toBe(true);
    expect(markup.includes("app_server_bridge_missing")).toBe(true);
    expect(markup.includes("App Server workflow")).toBe(false);
  });

  test("offers a connection settings action when the live gate is blocked by bridge status", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage
        project={project}
        step="interview"
        appServerBridge="missing"
        onOpenConnectionSettings={() => undefined}
      />,
    );

    // Then
    expect(markup.includes("app_server_bridge_missing")).toBe(true);
    expect(markup.includes("연결 및 실행 환경 열기")).toBe(true);
    expect(markup.includes('type="button"')).toBe(true);
  });

  test("enables the production interview action when the desktop bridge is available", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="interview" appServerBridge="available" />,
    );

    // Then
    expect(markup.includes("라이브 인터뷰 질문지 생성")).toBe(true);
    expect(markup.includes("app_server_bridge_missing")).toBe(false);
    expect(markup.includes("Bridge 감지")).toBe(true);
    expect(markup.includes("실행 시 Codex 상태 확인")).toBe(true);
    expect(markup.includes("실행 준비 완료")).toBe(false);
    expect(markup.includes("연결 및 실행 환경에서 Codex 연결 상태를 확인하세요.")).toBe(false);
    expect(markup.includes("상단 액션: 라이브 인터뷰 질문지 생성")).toBe(true);
  });

  test("renames the interview action when answers are ready for brief generation", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage
        project={project}
        step="interview"
        appServerBridge="available"
        actionLabelOverride="답변 제출하고 브리프 생성"
      />,
    );

    // Then
    expect(markup.includes("답변 제출하고 브리프 생성")).toBe(true);
    expect(markup.includes("상단 액션: 답변 제출하고 브리프 생성")).toBe(true);
    expect(markup.includes("라이브 인터뷰 질문지 생성")).toBe(false);
  });

  test("shows disabled progress feedback, expected stages, cancel, and retry copy while running", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage
        project={project}
        step="interview"
        appServerBridge="available"
        runStatus={{
          kind: "running",
          message: "라이브 인터뷰 질문을 생성하는 중입니다.",
          currentStep: "인터뷰 질문",
          expectedSteps: ["로그인 확인", "app-server smoke", "인터뷰 질문", "브리프 생성"],
          cancelRequested: false,
        }}
      />,
    );

    // Then
    expect(markup.includes("라이브 실행 중")).toBe(true);
    expect(markup.includes("상단 액션 대기: 라이브 실행 중")).toBe(true);
    expect(markup.includes("예상 단계")).toBe(true);
    expect(markup.includes("로그인 확인")).toBe(true);
    expect(markup.includes("app-server smoke")).toBe(true);
    expect(markup.includes("취소 요청")).toBe(true);
    expect(markup.includes("재시도")).toBe(false);
  });

  test("shows user-facing cause action and retry controls when a live run fails", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage
        project={project}
        step="interview"
        appServerBridge="available"
        runStatus={{
          kind: "failed",
          message: "spawn /missing/vendor/codex ENOENT",
          error: createCodexStatusActionError({
            code: "codex_cli_unavailable",
            message: "spawn /missing/vendor/codex ENOENT",
          }),
        }}
      />,
    );

    // Then
    expect(markup.includes("Codex CLI를 찾을 수 없습니다")).toBe(true);
    expect(markup.includes("원인")).toBe(true);
    expect(markup.includes("조치")).toBe(true);
    expect(markup.includes("지원 버전 1.0.0 이상 2.0.0 미만")).toBe(true);
    expect(markup.includes("재시도")).toBe(true);
    expect(markup.includes("상태 다시 확인")).toBe(true);
  });

  test("shows approval controls for a persisted live interview brief", () => {
    // Given
    const project = projectFixture({
      brief: { ...briefFixture(), approvedHash: undefined },
      stage: "INTERVIEW_APPROVAL_PENDING",
    });

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="interview" appServerBridge="available" />,
    );

    // Then
    expect(markup.includes("Live interview brief review")).toBe(true);
    expect(markup.includes("상단 버튼으로 승인하면 Research Pack 생성이 열립니다")).toBe(true);
    expect(markup.includes("분기 성과 공유")).toBe(true);
    expect(markup.includes("Live brief 승인하고 조사로 이동")).toBe(false);
  });

  test("shows upstream blockers before the production text pipeline can run", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(<ProductionWorkflowStage project={project} step="plan" />);

    // Then
    expect(markup.includes("라이브 기획/디자인/레이아웃 실행")).toBe(true);
    expect(markup.includes("슬라이드 기획")).toBe(true);
    expect(markup.includes("디자인 시스템")).toBe(true);
    expect(markup.includes("레이아웃 구조")).toBe(true);
    expect(markup.includes("missing_live_brief")).toBe(true);
    expect(markup.includes("missing_approved_research")).toBe(true);
  });

  test("shows a runnable text pipeline action when prerequisites and bridge are available", () => {
    // Given
    const project = projectFixture({
      brief: briefFixture(),
      research: researchFixture(),
      stage: "PLANNING",
    });

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="layout" appServerBridge="available" />,
    );

    // Then
    expect(markup.includes("라이브 텍스트 파이프라인 실행")).toBe(true);
    expect(markup.includes("Bridge 감지")).toBe(true);
    expect(markup.includes("실행 시 Codex 상태 확인")).toBe(true);
    expect(markup.includes("생성될 산출물: 기획, 디자인, 레이아웃")).toBe(true);
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

function researchFixture(): ResearchPack {
  return {
    id: "research_live_panel",
    sources: [],
    claims: [],
    datasets: [],
    charts: [],
    approvedHash: "hash_research_live",
    factCheckReport: {
      summary: "Ready for planning.",
      generatedAt: 1_789_300_010,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
  };
}
