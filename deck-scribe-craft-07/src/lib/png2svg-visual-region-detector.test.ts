import { describe, expect, test } from "bun:test";
import type { MvpEditableLayerModel } from "./editable-layer-model";
import type { Png2SvgSlideOutput } from "./png2svg-adapter-spike";
import { detectPng2SvgVisualRegions } from "./png2svg-visual-region-detector";

describe("PNG2SVG visual region detector port", () => {
  test("creates movable panel icon and photo-like region layers", () => {
    const report = detectPng2SvgVisualRegions({
      slide: slideOutput(),
      overlayModel: overlayModel(),
      originalPngHash: "sha256:slide-1",
      expectedRegionCount: 3,
    });

    expect(report.status).toBe("passed");
    expect(report.layers.map((layer) => layer.regionKind)).toEqual([
      "panel",
      "icon_block",
      "photo_like",
    ]);
    expect(report.layers.every((layer) => layer.movable)).toBe(true);
    expect(report.layers[0]).toEqual({
      id: "region_png2svg_visual_region_panel_1",
      type: "visual_region",
      regionKind: "panel",
      sourceLayerId: "png2svg.visual_region.panel_1",
      originalPngPath: "fixtures/slide_1.png",
      originalPngHash: "sha256:slide-1",
      bounds: { x: 100, y: 260, w: 520, h: 260 },
      confidence: 0.84,
      movable: true,
    });
  });

  test("rejects visual regions that intrude into editable overlay text", () => {
    const report = detectPng2SvgVisualRegions({
      slide: {
        ...slideOutput(),
        visualRegions: [
          {
            id: "title_overlap",
            kind: "vector",
            bounds: { x: 90, y: 80, w: 760, h: 110 },
            confidence: 0.9,
          },
        ],
        rasterRegions: [],
      },
      overlayModel: overlayModel(),
      originalPngHash: "sha256:slide-1",
      expectedRegionCount: 1,
    });

    expect(report.status).toBe("warning");
    expect(report.layers).toEqual([]);
    expect(report.issues.map((issue) => issue.code)).toEqual(["text-intrusion", "missing-region"]);
    expect(report.metrics.rejectedForOverlayCollision).toBe(1);
  });

  test("reports missing and blur-risk benchmark issues", () => {
    const report = detectPng2SvgVisualRegions({
      slide: {
        ...slideOutput(),
        visualRegions: [
          {
            id: "low_confidence_panel",
            kind: "vector",
            bounds: { x: 100, y: 300, w: 400, h: 220 },
            confidence: 0.42,
          },
        ],
        rasterRegions: [],
      },
      overlayModel: overlayModel(),
      originalPngHash: "sha256:slide-1",
      expectedRegionCount: 3,
    });

    expect(report.status).toBe("warning");
    expect(report.issues.map((issue) => issue.code)).toEqual(["blur-risk", "missing-region"]);
    expect(report.metrics.blurRiskCount).toBe(1);
    expect(report.metrics.missingRegionCount).toBe(2);
  });
});

function slideOutput(): Png2SvgSlideOutput {
  return {
    slideNumber: 1,
    pngPath: "fixtures/slide_1.png",
    svgPath: "slides/slide_1.svg",
    textCandidates: [],
    visualRegions: [
      {
        id: "panel_1",
        kind: "vector",
        bounds: { x: 100, y: 260, w: 520, h: 260 },
        confidence: 0.84,
      },
      {
        id: "icon_cluster",
        kind: "vector",
        bounds: { x: 680, y: 320, w: 96, h: 96 },
        confidence: 0.8,
      },
    ],
    rasterRegions: [
      {
        id: "photo_1",
        kind: "raster",
        bounds: { x: 840, y: 240, w: 420, h: 260 },
        confidence: 0.78,
        imageDataUrl: "data:image/png;base64,AAAA",
      },
    ],
  };
}

function overlayModel(): MvpEditableLayerModel {
  return {
    slideNumber: 1,
    layers: [
      {
        id: "editable_title",
        sourceLayerId: "dom_title",
        type: "text",
        role: "title",
        bounds: { x: 96, y: 80, w: 760, h: 120 },
        editable: true,
        text: "Title",
        sourceIds: [],
        datasetIds: [],
        sourceMapIds: ["title"],
        qualityLevel: "level2",
      },
    ],
  };
}
