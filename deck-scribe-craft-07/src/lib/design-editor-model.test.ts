import { describe, expect, test } from "bun:test";
import type { DesignSystem } from "./deck-types";
import {
  createDesignDraftUpdate,
  parseNegativeRuleText,
  updateDesignColor,
  updateDesignTypographyRule,
} from "./design-editor-model";

describe("design editor model", () => {
  test("updates color tokens immutably", () => {
    const design = validDesignSystem();

    const next = updateDesignColor(design, "accent", "#00AEEF");

    expect(design.colors.accent).toBe("#FFB000");
    expect(next.colors.accent).toBe("#00AEEF");
    expect(next.colors.background).toBe(design.colors.background);
  });

  test("updates typography bounds immutably", () => {
    const design = validDesignSystem();

    const next = updateDesignTypographyRule(design, "body", "minPx", 30);

    expect(design.typography.body.minPx).toBe(28);
    expect(next.typography.body.minPx).toBe(30);
    expect(next.typography.body.maxPx).toBe(38);
  });

  test("parses newline separated negative rules", () => {
    expect(parseNegativeRuleText(" do not invent chart values \n\n 출처 없는 수치 금지 ")).toEqual([
      "do not invent chart values",
      "출처 없는 수치 금지",
    ]);
  });

  test("creates a design draft update with downstream invalidation", () => {
    const update = createDesignDraftUpdate(validDesignSystem());

    expect(update.design.id).toBe("ds_001");
    expect(update.invalidated).toEqual({
      layout: true,
      generate: true,
      review: true,
      vectorize: true,
      editor: true,
      export: true,
    });
  });
});

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
    layoutRules: ["title top-left"],
    componentRules: ["charts use approved datasets only"],
    visualLanguage: "Editorial consulting",
    negativeRules: [
      "do not invent chart values",
      "do not use tiny unreadable text",
      "do not use random gradients",
    ],
  };
}
