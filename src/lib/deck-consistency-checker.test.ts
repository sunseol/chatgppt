import { describe, expect, test } from "bun:test";
import type { DesignSystem, LayoutPrototype } from "./deck-types";
import { checkDeckConsistency } from "./deck-consistency-checker";

describe("deck consistency checker", () => {
  test("passes a ten slide deck with consistent layout and design markers", () => {
    const report = checkDeckConsistency({
      design: designSystem(),
      layout: layoutPrototype(),
    });

    expect(report.status).toBe("passed");
    expect(report.summary.slideCount).toBe(10);
    expect(report.summary.violationRate).toBe(0);
    expect(report.summary.targetPassed).toBe(true);
    expect(report.regenerationCandidates).toEqual([]);
    expect(report.issues).toEqual([]);
  });

  test("marks style drift slides as regeneration candidates and fails the two of ten target", () => {
    const report = checkDeckConsistency({
      design: designSystem(),
      layout: driftLayoutPrototype(),
    });

    expect(report.status).toBe("failed");
    expect(report.summary.slideCount).toBe(10);
    expect(report.summary.driftSlideCount).toBe(3);
    expect(report.summary.violationRate).toBe(0.3);
    expect(report.summary.targetPassed).toBe(false);
    expect(report.regenerationCandidates.map((candidate) => candidate.slideNumber)).toEqual([
      1, 2, 3,
    ]);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "title-position-drift",
      "safe-margin-breach",
      "palette-token-drift",
      "chart-style-drift",
      "decorative-drift",
    ]);
  });

  test("reports unsupported palette tokens from slide html", () => {
    const report = checkDeckConsistency({
      design: designSystem(),
      layout: {
        ...layoutPrototype(),
        slides: [
          {
            ...consistentSlide(1),
            html: '<section data-color-token="color.unapproved"></section>',
          },
        ],
      },
    });

    expect(report.status).toBe("failed");
    expect(report.issues[0]?.code).toBe("palette-token-drift");
    expect(report.issues[0]?.slideNumber).toBe(1);
  });
});

function designSystem(): DesignSystem {
  return {
    id: "design_consistency",
    canvas: { ratio: "16:9", w: 1600, h: 900, safeMargin: { x: 96, y: 72 } },
    grid: { columns: 12, gutter: 24 },
    colors: {
      background: "#FFFFFF",
      textPrimary: "#111827",
      textSecondary: "#4B5563",
      primary: "#2563EB",
      secondary: "#14B8A6",
      accent: "#F97316",
    },
    typography: {
      titleStyle: "serif display",
      bodyStyle: "sans body",
      title: { style: "serif display", minPx: 48, maxPx: 64 },
      body: { style: "sans body", minPx: 26, maxPx: 36 },
      caption: { style: "sans caption", minPx: 18, maxPx: 24 },
      number: { style: "mono metric", minPx: 34, maxPx: 48 },
    },
    layoutRules: ["same title position", "safe margin on every slide"],
    componentRules: ["consistent chart style"],
    visualLanguage: "clean operational deck",
    negativeRules: ["decorative drift"],
    approvedHash: "sha256:design",
  };
}

function layoutPrototype(): LayoutPrototype {
  return {
    id: "layout_consistency",
    slides: Array.from({ length: 10 }, (_, index) => consistentSlide(index + 1)),
    approvedHash: "sha256:layout",
  };
}

function driftLayoutPrototype(): LayoutPrototype {
  return {
    ...layoutPrototype(),
    slides: layoutPrototype().slides.map((slide) => {
      if (slide.number === 1) {
        return {
          ...slide,
          domLayers: slide.domLayers.map((layer) =>
            layer.role === "title" ? { ...layer, bounds: { ...layer.bounds, y: 180 } } : layer,
          ),
        };
      }
      if (slide.number === 2) {
        return {
          ...slide,
          domLayers: slide.domLayers.map((layer) =>
            layer.role === "body" ? { ...layer, bounds: { ...layer.bounds, x: 0 } } : layer,
          ),
        };
      }
      if (slide.number === 3) {
        return {
          ...slide,
          html: '<section data-color-token="color.neon"></section>',
          domLayers: [
            ...slide.domLayers.map((layer) =>
              layer.role === "chart" ? { ...layer, datasetIds: [] } : layer,
            ),
            {
              id: "slide_03_sparkle",
              role: "decoration",
              editable: false,
              sourceIds: [],
              datasetIds: [],
              bounds: { x: 1200, y: 120, w: 180, h: 180 },
            },
          ],
        };
      }
      return slide;
    }),
  };
}

function consistentSlide(number: number): LayoutPrototype["slides"][number] {
  return {
    number,
    componentType: number % 3 === 0 ? "ChartWithInsight" : "KeyMessage",
    html: '<section data-color-token="color.primary" data-color-token="color.textPrimary"></section>',
    domLayers: [
      layer("title", number, { x: 96, y: 72, w: 1408, h: 120 }),
      layer("body", number, { x: 96, y: 240, w: 840, h: 360 }),
      layer("chart", number, { x: 980, y: 240, w: 524, h: 360 }, ["dataset_001"]),
      layer("source", number, { x: 96, y: 788, w: 1408, h: 40 }),
    ],
  };
}

function layer(
  role: string,
  slideNumber: number,
  bounds: LayoutPrototype["slides"][number]["domLayers"][number]["bounds"],
  datasetIds: readonly string[] = [],
): LayoutPrototype["slides"][number]["domLayers"][number] {
  return {
    id: `slide_${String(slideNumber).padStart(2, "0")}_${role}`,
    role,
    editable: true,
    sourceIds: role === "source" ? ["src_001"] : [],
    datasetIds: [...datasetIds],
    bounds,
  };
}
