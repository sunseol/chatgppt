import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectCockpit } from "./ProjectCockpit";
import type { DeckProject } from "@/lib/deck-types";

describe("project cockpit", () => {
  test("renders current stage, next action, runtime, approvals, and locked-step reason", () => {
    const markup = renderToStaticMarkup(
      <ProjectCockpit
        project={projectFixture()}
        step="design"
        runtime="production"
        appServerBridge="available"
      />,
    );

    expect(markup.includes("현재 단계")).toBe(true);
    expect(markup.includes("디자인 시스템")).toBe(true);
    expect(markup.includes("다음 액션")).toBe(true);
    expect(markup.includes("색상, 글꼴, 미리보기를 확인하고 승인하세요.")).toBe(true);
    expect(markup.includes("다음 액션: 색상, 글꼴")).toBe(false);
    expect(markup.includes("실행 모드")).toBe(true);
    expect(markup.includes("라이브 실행")).toBe(true);
    expect(markup.includes("Bridge 감지")).toBe(true);
    expect(markup.includes("앱 실행 통로 확인됨")).toBe(true);
    expect(markup.includes("실행 시 Codex 상태 확인")).toBe(true);
    expect(markup.includes("승인 2건")).toBe(true);
    expect(markup.includes("다음 잠김")).toBe(true);
    expect(markup.includes("승인된 디자인 시스템이 필요합니다.")).toBe(true);
    expect(markup.includes("다음 잠김: 잠김")).toBe(false);
  });

  test("renders a visible development runtime warning", () => {
    const markup = renderToStaticMarkup(
      <ProjectCockpit
        project={projectFixture({ stage: "PROJECT_CREATED" })}
        step="project"
        runtime="development"
        appServerBridge="missing"
      />,
    );

    expect(markup.includes("샘플 화면 모드")).toBe(true);
    expect(markup.includes("Codex 미연결")).toBe(true);
    expect(markup.includes("실제 Codex 실행이 아닙니다.")).toBe(true);
  });

  test("renders an actionable Codex connection button when settings are available", () => {
    const markup = renderToStaticMarkup(
      <ProjectCockpit
        project={projectFixture({ stage: "PROJECT_CREATED" })}
        step="interview"
        runtime="production"
        appServerBridge="missing"
        onOpenConnectionSettings={() => undefined}
      />,
    );

    expect(markup.includes("Codex 연결 설정 열기")).toBe(true);
    expect(markup.includes('type="button"')).toBe(true);
    expect(markup.includes("Bridge 없음")).toBe(true);
  });

  test("uses the visible route step as the cockpit stage", () => {
    const markup = renderToStaticMarkup(
      <ProjectCockpit
        project={projectFixture({ stage: "PROJECT_CREATED" })}
        step="interview"
        runtime="development"
        appServerBridge="missing"
      />,
    );

    expect(markup.includes("현재 단계")).toBe(true);
    expect(markup.includes("인터뷰")).toBe(true);
    expect(markup.includes("프로젝트 정보를 확인하고 인터뷰를 시작하세요.")).toBe(false);
  });

  test("promotes live workflow success into the cockpit Codex badge", () => {
    const markup = renderToStaticMarkup(
      <ProjectCockpit
        project={projectFixture({ stage: "INTERVIEWING" })}
        step="interview"
        runtime="production"
        appServerBridge="available"
        codexRunStatus={{
          kind: "succeeded",
          message: "라이브 인터뷰 브리프가 준비되었습니다.",
          currentStep: "브리프 생성",
        }}
      />,
    );

    expect(markup.includes("성공")).toBe(true);
    expect(markup.includes("라이브 인터뷰 브리프가 준비되었습니다.")).toBe(true);
    expect(markup.includes("완료 단계: 브리프 생성")).toBe(true);
  });

  test("promotes live workflow failure into the cockpit Codex badge", () => {
    const markup = renderToStaticMarkup(
      <ProjectCockpit
        project={projectFixture({ stage: "INTERVIEWING" })}
        step="interview"
        runtime="production"
        appServerBridge="available"
        codexRunStatus={{
          kind: "failed",
          message: "Codex 실행에 실패했습니다",
          error: {
            title: "Codex 실행에 실패했습니다",
            cause: "app-server smoke 실패",
            action: "연결 및 실행 환경에서 다시 확인하세요.",
            retryLabel: "재시도",
            rawMessage: "smoke failed",
          },
        }}
      />,
    );

    expect(markup.includes("실패")).toBe(true);
    expect(markup.includes("app-server smoke 실패")).toBe(true);
    expect(markup.includes("연결 및 실행 환경에서 다시 확인하세요.")).toBe(true);
  });
});

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_cockpit",
    name: "Cockpit Project",
    initialPrompt: "Build a visible cockpit.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage: "DESIGNING",
    createdAt: 1,
    updatedAt: 2,
    invalidated: {},
    approvalLog: [
      { stage: "interview", at: 1, hash: "hash_interview" },
      { stage: "research", at: 2, hash: "hash_research" },
    ],
    ...patch,
  };
}
