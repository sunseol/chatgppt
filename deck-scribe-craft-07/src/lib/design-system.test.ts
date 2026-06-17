import { describe, expect, test } from "bun:test";
import type { DesignSystem } from "./deck-types";
import {
  createApprovedDesignSystemArtifact,
  DesignSystemSchema,
  parseDesignSystem,
} from "./design-system";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "./mock-ai";

describe("design system schema", () => {
  test("parses a complete design system", () => {
    const design = parseDesignSystem(validDesignSystem());

    expect(design.canvas.safeMargin).toEqual({ x: 96, y: 72 });
    expect(design.grid).toEqual({ columns: 12, gutter: 24 });
    expect(design.typography.body.minPx).toBe(28);
    expect(design.typography.body.maxPx).toBe(38);
    expect(design.layoutRules.includes("title top-left")).toBe(true);
    expect(design.componentRules.includes("charts use approved datasets only")).toBe(true);
    expect(design.negativeRules.includes("do not invent chart values")).toBe(true);
  });

  test("rejects unsafe typography bounds", () => {
    const result = parseResult({
      ...validDesignSystem(),
      typography: {
        ...validDesignSystem().typography,
        body: { style: "clean sans", minPx: 8, maxPx: 6 },
      },
    });

    expect(result.success).toBe(false);
  });

  test("locks approved design system as an immutable artifact", () => {
    const artifact = createApprovedDesignSystemArtifact({
      projectId: "project_001",
      design: validDesignSystem(),
      version: 2,
      approvedAt: 123,
    });

    expect(artifact.record.type).toBe("design");
    expect(artifact.record.version).toBe(2);
    expect(artifact.design.approvedHash === undefined).toBe(true);
    expect(Object.isFrozen(artifact.design.negativeRules)).toBe(true);
    expect(Object.isFrozen(artifact.design.typography.body)).toBe(true);
  });

  test("mock design satisfies the structured design system schema", () => {
    const brief = mockBrief("투자자 피치덱", 8, "16:9");
    const research = mockResearch(brief);
    const plan = { ...mockPlan(brief, research), approvedHash: "sha256:plan" };
    const design = parseDesignSystem(mockDesign(brief, plan));

    expect(design.canvas.safeMargin).toEqual({ x: 96, y: 72 });
    expect(design.negativeRules.includes("출처 없는 수치 시각화 금지")).toBe(true);
  });
});

function parseResult(input: unknown) {
  return DesignSystemSchema.safeParse(input);
}

function validDesignSystem(): DesignSystem {
  return {
    id: "ds_001",
    canvas: {
      ratio: "16:9",
      w: 1920,
      h: 1080,
      safeMargin: { x: 96, y: 72 },
    },
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
    layoutRules: ["title top-left", "same margin"],
    componentRules: ["charts use approved datasets only", "cards use 8px radius"],
    visualLanguage: "Editorial consulting",
    negativeRules: [
      "do not use random gradients",
      "do not use tiny unreadable text",
      "do not invent chart values",
    ],
  };
}
