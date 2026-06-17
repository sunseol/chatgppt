import { describe, expect, test } from "bun:test";
import type { MvpEditableLayerModel } from "./editable-layer-model";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "./mock-ai";
import {
  estimateEditableSvgSimilarity,
  renderEditableSvg,
  type SvgRegionLayer,
} from "./editable-svg-renderer";

describe("editable SVG renderer", () => {
  test("renders separated editable SVG layers without Figma runtime metadata", () => {
    const design = designFixture();
    const rendered = renderEditableSvg({
      canvas: { width: design.canvas.w, height: design.canvas.h },
      backgroundImageDataUrl: "data:image/png;base64,AAAA",
      model: layerModelFixture(),
      design,
    });

    expect(rendered.svg.includes('data-role="generated-background"')).toBe(true);
    expect(rendered.svg.includes('data-locked="true"')).toBe(true);
    expect(rendered.svg.includes('data-layer-type="text"')).toBe(true);
    expect(rendered.svg.includes('font-family="ui-serif, Georgia')).toBe(true);
    expect(rendered.svg.includes('data-layer-type="chart"')).toBe(true);
    expect(rendered.svg.includes('data-layer-type="shape"')).toBe(true);
    expect(rendered.svg.includes('data-layer-type="image"')).toBe(true);
    expect(rendered.svg.includes("figma-import")).toBe(false);
    expect(rendered.editableObjectCount).toBe(4);
  });

  test("renders optional vector and image region extension layers", () => {
    const rendered = renderEditableSvg({
      canvas: { width: 1600, height: 900 },
      model: layerModelFixture(),
      design: designFixture(),
      extensionLayers: extensionLayersFixture(),
    });

    expect(rendered.svg.includes('data-extension-layer="vector_region_1"')).toBe(true);
    expect(rendered.svg.includes('data-extension-type="vector_region"')).toBe(true);
    expect(rendered.svg.includes('data-extension-layer="image_region_1"')).toBe(true);
    expect(rendered.svg.includes('data-extension-type="image_region"')).toBe(true);
  });

  test("passes the deterministic visual similarity threshold for complete SVG output", () => {
    const rendered = renderEditableSvg({
      canvas: { width: 1600, height: 900 },
      model: layerModelFixture(),
      design: designFixture(),
    });
    const similarity = estimateEditableSvgSimilarity({
      sourceLayerCount: layerModelFixture().layers.length,
      renderedLayerCount: rendered.renderedLayerCount,
      thresholdPercent: 10,
    });

    expect(similarity.deltaPercent).toBe(0);
    expect(similarity.passed).toBe(true);
  });
});

function layerModelFixture(): MvpEditableLayerModel {
  return {
    slideNumber: 1,
    layers: [
      {
        id: "editable_title_1",
        sourceLayerId: "dom_title_1",
        type: "text",
        role: "title",
        text: "편집 가능한 SVG 제목",
        bounds: { x: 96, y: 96, w: 900, h: 120 },
        editable: true,
        sourceIds: [],
        datasetIds: [],
        sourceMapIds: ["map_title"],
        qualityLevel: "level2",
      },
      {
        id: "editable_chart_1",
        sourceLayerId: "dom_chart_1",
        type: "chart",
        role: "chart",
        bounds: { x: 1000, y: 320, w: 420, h: 320 },
        editable: true,
        sourceIds: ["src_001"],
        datasetIds: ["dataset_001"],
        sourceMapIds: ["map_chart"],
        qualityLevel: "level2",
        chartOverlayId: "overlay_chart_001",
      },
      {
        id: "editable_shape_1",
        sourceLayerId: "dom_shape_1",
        type: "shape",
        role: "callout",
        bounds: { x: 96, y: 280, w: 360, h: 180 },
        editable: true,
        sourceIds: [],
        datasetIds: [],
        sourceMapIds: ["map_shape"],
        qualityLevel: "level2",
      },
      {
        id: "editable_image_1",
        sourceLayerId: "dom_image_1",
        type: "image",
        role: "visual",
        bounds: { x: 520, y: 280, w: 360, h: 180 },
        editable: true,
        sourceIds: [],
        datasetIds: [],
        sourceMapIds: ["map_image"],
        qualityLevel: "level2",
      },
    ],
  };
}

function extensionLayersFixture(): readonly SvgRegionLayer[] {
  return [
    {
      id: "vector_region_1",
      type: "vector_region",
      sourceLayerId: "png2svg_vector_1",
      bounds: { x: 120, y: 520, w: 240, h: 120 },
      pathData: "M 120 520 L 360 520 L 360 640 Z",
    },
    {
      id: "image_region_1",
      type: "image_region",
      sourceLayerId: "png2svg_image_1",
      bounds: { x: 420, y: 520, w: 240, h: 120 },
      imageDataUrl: "data:image/png;base64,BBBB",
    },
  ];
}

function designFixture() {
  const brief = mockBrief("SVG renderer", 8, "16:9");
  const research = mockResearch(brief);
  const plan = { ...mockPlan(brief, research), approvedHash: "sha256:plan" };
  return mockDesign(brief, plan);
}
