import { describe, expect, test } from "bun:test";
import type { DesignSystem, EditableLayerModel } from "./deck-types";
import { buildFigmaPackage, parseFigmaPackage } from "./figma-package";

describe("figma package", () => {
  test("exports editable text and shape layers with explicit fallbacks", () => {
    const pkg = buildFigmaPackage({
      projectId: "project_001",
      design: baseDesignSystem(),
      layers: layerModels(),
      exportedAt: 200,
      reusesReferenceImporter: true,
    });

    expect(pkg.manifest.format).toBe("deckforge_figma_package");
    expect(pkg.manifest.editableLayerCount).toBe(2);
    expect(pkg.manifest.fallbackLayerCount).toBe(2);
    expect(pkg.manifest.licenseNotice.includes("PNG2SVG")).toBe(true);
    expect(pkg.slides[0].layers.map((layer) => layer.kind)).toEqual(["text", "shape", "fallback"]);
  });

  test("parses a figma package into an import summary", () => {
    const summary = parseFigmaPackage(
      buildFigmaPackage({
        projectId: "project_001",
        design: baseDesignSystem(),
        layers: layerModels(),
        exportedAt: 200,
        reusesReferenceImporter: false,
      }),
    );

    expect(summary.editableLayerIds).toEqual(["title_1", "shape_1"]);
    expect(summary.fallbacks).toEqual([
      { layerId: "chart_1", reason: "chart layers require image fallback in Figma package" },
      { layerId: "image_2", reason: "image layers are preserved as bitmap fallback" },
    ]);
  });
});

function layerModels(): readonly EditableLayerModel[] {
  return [
    {
      slideNumber: 1,
      layers: [
        {
          id: "title_1",
          type: "text",
          role: "title",
          text: "Board Update",
          bounds: { x: 96, y: 96, w: 900, h: 120 },
          editable: true,
        },
        {
          id: "shape_1",
          type: "shape",
          role: "panel",
          bounds: { x: 80, y: 220, w: 1440, h: 540 },
          editable: true,
        },
        {
          id: "chart_1",
          type: "chart",
          role: "chart",
          bounds: { x: 120, y: 260, w: 840, h: 420 },
          editable: true,
        },
      ],
    },
    {
      slideNumber: 2,
      layers: [
        {
          id: "image_2",
          type: "image",
          role: "hero",
          bounds: { x: 900, y: 180, w: 520, h: 420 },
          editable: false,
        },
      ],
    },
  ];
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
