import { describe, expect, test } from "bun:test";
import type { DeckProject, Stage, StepKey } from "./deck-types";
import {
  canGenerateLayoutPrototype,
  getReachableSteps,
  getRedirectStep,
  getVisitStage,
  invalidatedAfter,
  nextStageAfterApproval,
} from "./workflow-engine";

function projectAt(stage: Stage): DeckProject {
  return {
    id: "p_test",
    name: "Test Deck",
    initialPrompt: "Build a verified deck.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage,
    createdAt: 1,
    updatedAt: 1,
    invalidated: {},
    approvalLog: [],
  };
}

describe("workflow engine", () => {
  test("keeps future steps locked when the project is freshly created", () => {
    const project = projectAt("PROJECT_CREATED");

    expect(getReachableSteps(project)).toEqual(["project", "interview"]);
    expect(getRedirectStep(project, "research")).toBe("project");
  });

  test("moves into interviewing when the project step starts the interview", () => {
    expect(getVisitStage("PROJECT_CREATED", "interview")).toBe("INTERVIEWING");
    expect(getVisitStage("INTERVIEWING", "interview")).toBe("INTERVIEWING");
  });

  test("advances approval gates to the expected next stages", () => {
    const approvals: readonly { readonly step: StepKey; readonly stage: Stage }[] = [
      { step: "interview", stage: "RESEARCHING" },
      { step: "research", stage: "PLANNING" },
      { step: "plan", stage: "DESIGNING" },
      { step: "design", stage: "PROTOTYPING_LAYOUT" },
      { step: "layout", stage: "GENERATING_SLIDES" },
      { step: "review", stage: "EDITOR" },
      { step: "vectorize", stage: "EDITOR" },
      { step: "editor", stage: "FINAL_REPORTING" },
    ];

    for (const approval of approvals) {
      expect(nextStageAfterApproval(approval.step)).toBe(approval.stage);
    }
  });

  test("invalidates only downstream steps", () => {
    expect(invalidatedAfter("design")).toEqual({
      layout: true,
      generate: true,
      review: true,
      editor: true,
      export: true,
    });
  });

  test("keeps layout generation locked until the design system is approved", () => {
    const pendingDesign = {
      ...projectAt("DESIGN_APPROVAL_PENDING"),
      plan: { id: "plan_001", markdown: "# Plan", slides: [], approvedHash: "sha256:plan" },
      design: validDesignSystem(undefined),
    };
    const approvedDesign = {
      ...pendingDesign,
      stage: "PROTOTYPING_LAYOUT" as const,
      design: validDesignSystem("sha256:design"),
    };

    expect(canGenerateLayoutPrototype(pendingDesign)).toBe(false);
    expect(getRedirectStep(pendingDesign, "layout")).toBe("design");
    expect(canGenerateLayoutPrototype(approvedDesign)).toBe(true);
    expect(getRedirectStep(approvedDesign, "layout")).toBe("layout");
  });
});

function validDesignSystem(approvedHash: string | undefined) {
  return {
    id: "ds_001",
    canvas: { ratio: "16:9" as const, w: 1920, h: 1080, safeMargin: { x: 96, y: 72 } },
    grid: { columns: 12, gutter: 24 },
    colors: {
      background: "#F7F4EF",
      textPrimary: "#111111",
      textSecondary: "#555555",
      primary: "#1F4E79",
      secondary: "#8AA4BF",
      accent: "#FFB000",
    },
    typography: {
      titleStyle: "bold geometric sans",
      bodyStyle: "clean sans",
      title: { style: "bold geometric sans", minPx: 56, maxPx: 84 },
      body: { style: "clean sans", minPx: 28, maxPx: 38 },
      caption: { style: "clean sans", minPx: 18, maxPx: 24 },
      number: { style: "tabular sans", minPx: 40, maxPx: 72 },
    },
    layoutRules: ["title top-left"],
    componentRules: ["charts use approved datasets only"],
    visualLanguage: "Editorial consulting",
    negativeRules: [
      "do not invent chart values",
      "do not use tiny unreadable text",
      "do not use random gradients",
    ],
    approvedHash,
  };
}
