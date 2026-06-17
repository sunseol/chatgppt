import { describe, expect, test } from "bun:test";
import type { MvpEditableLayerModel } from "./editable-layer-model";
import type { DetectedVisualRegionLayer } from "./png2svg-visual-region-detector";
import { mergeAdvancedLayerModel, scoreAdvancedLayerMatching } from "./advanced-layer-matching";

describe("advanced layer matching", () => {
  test("preserves DOM overlay layers and appends PNG2SVG visual regions", () => {
    const result = mergeAdvancedLayerModel({
      mvpModel: mvpModel(),
      visualRegions: visualRegions(),
      ocrTextHints: [],
    });

    expect(result.model.layers.map((layer) => layer.sourceLayerId)).toEqual([
      "dom_title",
      "dom_chart",
      "png2svg.visual_region.panel_1",
      "png2svg.raster_region.photo_1",
    ]);
    expect(result.model.layers[0]).toEqual(mvpModel().layers[0]);
    expect(result.addedLayerCount).toBe(2);
    expect(result.safeOverlayPathPreserved).toBe(true);
    expect(result.model.layers.slice(2).every((layer) => layer.qualityLevel === "level3")).toBe(
      true,
    );
  });

  test("keeps DOM text authoritative over OCR hints", () => {
    const result = mergeAdvancedLayerModel({
      mvpModel: mvpModel(),
      visualRegions: [],
      ocrTextHints: [{ sourceLayerId: "dom_title", text: "OCR wrong title" }],
    });

    expect(result.model.layers.find((layer) => layer.id === "editable_title")?.text).toBe(
      "원본 제목",
    );
    expect(result.ignoredOcrHintCount).toBe(1);
  });

  test("scores oversegmented unusable slide rate at the ten percent target", () => {
    const passing = scoreAdvancedLayerMatching(
      Array.from({ length: 10 }, (_, index) => ({
        slideNumber: index + 1,
        oversegmentedRegionCount: index === 0 ? 9 : 0,
      })),
    );
    const failing = scoreAdvancedLayerMatching(
      Array.from({ length: 10 }, (_, index) => ({
        slideNumber: index + 1,
        oversegmentedRegionCount: index < 2 ? 9 : 0,
      })),
    );

    expect(passing.unusableSlideRate).toBe(0.1);
    expect(passing.passed).toBe(true);
    expect(failing.unusableSlideRate).toBe(0.2);
    expect(failing.passed).toBe(false);
  });
});

function mvpModel(): MvpEditableLayerModel {
  return {
    slideNumber: 1,
    layers: [
      {
        id: "editable_title",
        sourceLayerId: "dom_title",
        type: "text",
        role: "title",
        text: "원본 제목",
        bounds: { x: 96, y: 80, w: 760, h: 120 },
        editable: true,
        sourceIds: [],
        datasetIds: [],
        sourceMapIds: ["title"],
        qualityLevel: "level2",
      },
      {
        id: "editable_chart",
        sourceLayerId: "dom_chart",
        type: "chart",
        role: "chart",
        bounds: { x: 820, y: 300, w: 420, h: 260 },
        editable: true,
        sourceIds: ["src_1"],
        datasetIds: ["dataset_1"],
        sourceMapIds: ["chart"],
        qualityLevel: "level2",
        chartOverlayId: "chart_overlay_1",
      },
    ],
  };
}

function visualRegions(): readonly DetectedVisualRegionLayer[] {
  return [
    {
      id: "region_png2svg_visual_region_panel_1",
      type: "visual_region",
      regionKind: "panel",
      sourceLayerId: "png2svg.visual_region.panel_1",
      originalPngPath: "fixtures/slide_1.png",
      originalPngHash: "sha256:slide-1",
      bounds: { x: 100, y: 260, w: 520, h: 260 },
      confidence: 0.84,
      movable: true,
    },
    {
      id: "region_png2svg_raster_region_photo_1",
      type: "image_region",
      regionKind: "photo_like",
      sourceLayerId: "png2svg.raster_region.photo_1",
      originalPngPath: "fixtures/slide_1.png",
      originalPngHash: "sha256:slide-1",
      bounds: { x: 700, y: 260, w: 420, h: 260 },
      confidence: 0.78,
      movable: true,
    },
  ];
}
