import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { DeckProject } from "@/lib/deck-types";
import { LocalProjectDataControls } from "./LocalProjectDataControls";

describe("local project data controls", () => {
  test("renders local storage location and project folder actions", () => {
    const markup = renderToStaticMarkup(
      <LocalProjectDataControls
        project={projectFixture()}
        deleteArmed={false}
        folderStatus={{ kind: "idle" }}
        onArmDelete={() => undefined}
        onConfirmDelete={() => undefined}
        onExport={() => undefined}
        onOpenFolder={() => undefined}
      />,
    );

    expect(markup.includes("저장 위치")).toBe(true);
    expect(markup.includes("deckforge.projects.v1")).toBe(true);
    expect(markup.includes("projects/project_001")).toBe(true);
    expect(markup.includes("클라우드 동기화 없음")).toBe(true);
    expect(markup.includes("Finder에서 열기")).toBe(true);
    expect(markup.includes("프로젝트 폴더 내보내기")).toBe(true);
    expect(markup.includes("로컬 삭제")).toBe(true);
  });

  test("renders an explicit delete confirmation state inside the app", () => {
    const markup = renderToStaticMarkup(
      <LocalProjectDataControls
        project={projectFixture()}
        deleteArmed
        folderStatus={{ kind: "idle" }}
        onArmDelete={() => undefined}
        onConfirmDelete={() => undefined}
        onExport={() => undefined}
        onOpenFolder={() => undefined}
      />,
    );

    expect(markup.includes("삭제 확인")).toBe(true);
  });
});

function projectFixture(): DeckProject {
  return {
    id: "project_001",
    name: "Local UI Fixture",
    initialPrompt: "Build locally",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "PROJECT_CREATED",
    createdAt: 1,
    updatedAt: 2,
    invalidated: {},
    approvalLog: [],
  };
}
