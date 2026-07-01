import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalDataDialogBody, SettingsDialogBody } from "./HomeToolDialog";
import type { DeckProject } from "@/lib/deck-types";

describe("home tool dialog bodies", () => {
  test("settings exposes one verified Codex status after login and smoke pass", () => {
    const markup = renderToStaticMarkup(
      <SettingsDialogBody
        appServerBridge="available"
        loginStatus={{ kind: "completed", success: true, output: "Logged in using ChatGPT" }}
        smokeStatus={{
          kind: "completed",
          accountType: "chatgpt",
          threadId: "thread_live",
          turnId: "turn_live",
        }}
        onRefreshLogin={() => undefined}
        onOpenLogin={() => undefined}
        onRunSmoke={() => undefined}
      />,
    );

    expect(markup.includes("현재 Codex 상태")).toBe(true);
    expect(markup.includes("검증됨")).toBe(true);
    expect(markup.includes("Codex 연결됨")).toBe(true);
    expect(markup.includes("Codex 실행 통로")).toBe(true);
    expect(markup.includes("데스크톱 실행 환경")).toBe(true);
    expect(markup.includes("라이브 실행 테스트")).toBe(true);
    expect(markup.includes("Bridge 감지 (available)")).toBe(false);
    expect(markup.includes("앱 실행 통로 확인됨")).toBe(true);
    expect(markup.includes("Codex CLI 로그인")).toBe(true);
    expect(markup.includes("Logged in using ChatGPT")).toBe(true);
    expect(markup.includes("Codex 로그인")).toBe(true);
    expect(markup.includes("Codex 상태 확인")).toBe(true);
    expect(markup.includes("로그인 열기")).toBe(false);
    expect(markup.includes("로그인 상태 새로고침")).toBe(false);
    expect(markup.includes("연결 확인")).toBe(true);
    expect(markup.includes("Provider 기능 매트릭스")).toBe(true);
    expect(markup.includes("로그인 필요")).toBe(false);
    expect(markup.includes("연결 및 실행 환경에서 Codex 연결 상태를 확인하세요.")).toBe(false);
    expect(markup.includes("App Server bridge")).toBe(false);
    expect(markup.includes("Live workflow smoke test")).toBe(false);
  });

  test("settings constrains long Codex errors inside the modal", () => {
    const longError =
      "Error: spawn /Users/gaara/.bun/install/global/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/codex/codex ENOENT\nspawnargs: [ 'login', 'status' ]";

    const markup = renderToStaticMarkup(
      <SettingsDialogBody
        appServerBridge="available"
        loginStatus={{ kind: "failed", message: longError }}
        smokeStatus={{ kind: "idle" }}
        onRefreshLogin={() => undefined}
        onOpenLogin={() => undefined}
        onRunSmoke={() => undefined}
      />,
    );

    expect(markup.includes("min-w-0")).toBe(true);
    expect(markup.includes("whitespace-pre-wrap")).toBe(true);
    expect(markup.includes("overflow-auto")).toBe(true);
    expect(markup.includes("[overflow-wrap:anywhere]")).toBe(true);
  });

  test("local data exposes real project management actions", () => {
    const markup = renderToStaticMarkup(
      <LocalDataDialogBody
        projects={[projectFixture()]}
        deleteAllArmed={false}
        onExportAll={() => undefined}
        onArmDeleteAll={() => undefined}
        onConfirmDeleteAll={() => undefined}
      />,
    );

    expect(markup.includes("deckforge.projects.v1")).toBe(true);
    expect(markup.includes("전체 프로젝트 내보내기")).toBe(true);
    expect(markup.includes("전체 로컬 삭제")).toBe(true);
    expect(markup.includes("Local Data Fixture")).toBe(true);
  });
});

function projectFixture(): DeckProject {
  return {
    id: "project_001",
    name: "Local Data Fixture",
    initialPrompt: "Manage local data.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "PROJECT_CREATED",
    createdAt: 1,
    updatedAt: 2,
    invalidated: {},
    approvalLog: [],
  };
}
