import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { DeckProject } from "@/lib/deck-types";
import { getWorkflowStepItems } from "@/lib/workflow-stepper";
import { WorkflowStepRows } from "./Stepper";

describe("workflow stepper UI", () => {
  test("renders explicit state labels and recovery guidance", () => {
    const markup = renderToStaticMarkup(
      <WorkflowStepRows items={getWorkflowStepItems(projectFixture())} />,
    );

    expect(markup.includes("완료")).toBe(true);
    expect(markup.includes("현재 단계")).toBe(true);
    expect(markup.includes("잠김")).toBe(true);
    expect(markup.includes("레이아웃 승인 후 접근할 수 있습니다.")).toBe(true);
    expect(markup.includes("재생성 필요")).toBe(true);
    expect(markup.includes("재생성 또는 재승인")).toBe(true);
    expect(markup.includes("다음 액션")).toBe(true);
  });
});

function projectFixture(): DeckProject {
  return {
    id: "p_stepper_ui",
    name: "Stepper UI",
    initialPrompt: "Build a workflow deck.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage: "DESIGNING",
    createdAt: 1,
    updatedAt: 1,
    invalidated: { layout: true },
    approvalLog: [],
  };
}
