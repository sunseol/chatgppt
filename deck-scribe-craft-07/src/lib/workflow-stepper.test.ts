import { describe, expect, test } from "bun:test";
import type { DeckProject, Stage } from "./deck-types";
import { getWorkflowStepItems } from "./workflow-stepper";

describe("workflow stepper model", () => {
  test("marks completed current locked and invalidated states with action guidance", () => {
    const project = projectAt("DESIGNING", { layout: true });

    const items = getWorkflowStepItems(project);

    expect(items.find((item) => item.key === "plan")?.status).toBe("completed");
    expect(items.find((item) => item.key === "design")?.status).toBe("current");
    expect(items.find((item) => item.key === "generate")?.status).toBe("locked");
    expect(items.find((item) => item.key === "layout")?.status).toBe("invalidated");
    expect(items.find((item) => item.key === "design")?.detail.includes("다음 액션")).toBe(true);
    expect(
      items.find((item) => item.key === "generate")?.detail.includes("레이아웃 승인 후 접근"),
    ).toBe(true);
    expect(items.find((item) => item.key === "layout")?.detail.includes("다시 확인")).toBe(true);
  });
});

function projectAt(stage: Stage, invalidated: DeckProject["invalidated"] = {}): DeckProject {
  return {
    id: "p_stepper",
    name: "Stepper UX",
    initialPrompt: "Build a workflow deck.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage,
    createdAt: 1,
    updatedAt: 1,
    invalidated,
    approvalLog: [],
  };
}
