import { describe, expect, test } from "bun:test";
import type { DesignSystem, LayoutPrototype } from "./deck-types";
import {
  DeckStyleLearningError,
  applyApprovedDeckStyleRecommendation,
  approveDeckStyleRecommendation,
  extractDeckStyleProfile,
  recommendDeckStyleApplication,
} from "./deck-style-learning";

describe("deck style learning", () => {
  test("extracts style patterns only from local deck uploads", () => {
    expect(() =>
      extractDeckStyleProfile([
        {
          deckId: "remote_001",
          source: "remote_import",
          design: sampleDesign("Remote Style", "#123456"),
          layout: sampleLayout(["ChartWithInsight"]),
        },
      ]),
    ).toThrow(DeckStyleLearningError);
  });

  test("does not allow extracted style recommendations to apply before approval", () => {
    const profile = extractDeckStyleProfile([
      {
        deckId: "deck_001",
        source: "local_upload",
        design: sampleDesign("Investor Brief", "#0B3A6E"),
        layout: sampleLayout(["ChartWithInsight", "KeyMessage"]),
      },
      {
        deckId: "deck_002",
        source: "local_upload",
        design: sampleDesign("Investor Brief", "#0B3A6E"),
        layout: sampleLayout(["ChartWithInsight", "MetricCards"]),
      },
    ]);
    const recommendation = recommendDeckStyleApplication(baseDesignSystem(), profile);

    expect(recommendation.status).toBe("pending_approval");
    expect(recommendation.layoutHints.topComponents).toEqual(["ChartWithInsight", "KeyMessage"]);
    expect(() => applyApprovedDeckStyleRecommendation(baseDesignSystem(), recommendation)).toThrow(
      DeckStyleLearningError,
    );
  });

  test("applies an approved style recommendation onto the base design system", () => {
    const profile = extractDeckStyleProfile([
      {
        deckId: "deck_001",
        source: "local_upload",
        design: sampleDesign("Investor Brief", "#0B3A6E"),
        layout: sampleLayout(["ChartWithInsight", "KeyMessage"]),
      },
      {
        deckId: "deck_002",
        source: "local_upload",
        design: sampleDesign("Investor Brief", "#0B3A6E"),
        layout: sampleLayout(["ChartWithInsight", "MetricCards"]),
      },
    ]);
    const approved = approveDeckStyleRecommendation(
      recommendDeckStyleApplication(baseDesignSystem(), profile),
      { approvedAt: 300, approvedBy: "owner_1" },
    );
    const applied = applyApprovedDeckStyleRecommendation(baseDesignSystem(), approved);

    expect(applied.design.colors.primary).toBe("#0B3A6E");
    expect(applied.design.visualLanguage).toBe("Investor Brief");
    expect(applied.layoutHints.topComponents[0]).toBe("ChartWithInsight");
  });
});

function sampleLayout(componentTypes: readonly string[]): LayoutPrototype {
  return {
    id: `layout_${componentTypes.join("_")}`,
    slides: componentTypes.map((componentType, index) => ({
      number: index + 1,
      componentType,
      html: `<section>${componentType}</section>`,
      domLayers: [],
    })),
  };
}

function sampleDesign(visualLanguage: string, primary: string): DesignSystem {
  return {
    ...baseDesignSystem(),
    visualLanguage,
    colors: {
      ...baseDesignSystem().colors,
      primary,
    },
    typography: {
      ...baseDesignSystem().typography,
      titleStyle: `${visualLanguage} Title`,
      bodyStyle: `${visualLanguage} Body`,
      title: { ...baseDesignSystem().typography.title, style: `${visualLanguage} Title` },
      body: { ...baseDesignSystem().typography.body, style: `${visualLanguage} Body` },
    },
  };
}

function baseDesignSystem(): DesignSystem {
  return {
    id: "design_001",
    canvas: {
      ratio: "16:9",
      w: 1600,
      h: 900,
      safeMargin: { x: 96, y: 72 },
    },
    grid: { columns: 12, gutter: 24 },
    colors: {
      background: "#F7F4EF",
      textPrimary: "#111111",
      textSecondary: "#555555",
      primary: "#204060",
      secondary: "#8AA4BF",
      accent: "#E0A100",
    },
    typography: {
      titleStyle: "Founders Grotesk",
      bodyStyle: "Pretendard",
      title: { style: "Founders Grotesk", minPx: 56, maxPx: 84 },
      body: { style: "Pretendard", minPx: 28, maxPx: 38 },
      caption: { style: "Pretendard", minPx: 18, maxPx: 24 },
      number: { style: "Founders Grotesk", minPx: 36, maxPx: 72 },
    },
    layoutRules: ["Keep a consistent title origin."],
    componentRules: ["Charts use approved datasets only."],
    visualLanguage: "Editorial consulting",
    negativeRules: ["Do not invent chart values."],
  };
}
