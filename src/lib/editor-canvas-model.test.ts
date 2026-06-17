import { describe, expect, test } from "bun:test";
import type { EditableLayerModel } from "./deck-types";
import {
  buildDeckEditorCanvasModels,
  buildEditorCanvasModel,
  estimateDeckOpenPerformance,
} from "./editor-canvas-model";

describe("editor canvas rendering model", () => {
  test("builds visible render nodes for every editable layer type", () => {
    const model = buildEditorCanvasModel({
      canvas: { width: 1600, height: 900 },
      layerModel: layerModelFixture(),
    });

    expect(model.slideNumber).toBe(1);
    expect(model.layers.map((layer) => layer.type)).toEqual(["shape", "text", "image", "chart"]);
    expect(model.layers.map((layer) => layer.zIndex)).toEqual([0, 1, 2, 3]);
    expect(model.layers[0]?.locked).toBe(true);
    expect(model.layers[1]?.text).toBe("기존 제목");
    expect(model.layers[2]?.ariaLabel).toBe("image layer hero");
    expect(model.layers[3]?.style).toEqual({
      left: "62.50%",
      top: "44.44%",
      width: "25.00%",
      height: "33.33%",
    });
  });

  test("keeps a ten slide deck within the local open performance target", () => {
    const deckModels = buildDeckEditorCanvasModels({
      canvas: { width: 1600, height: 900 },
      layerModels: Array.from({ length: 10 }, (_, index) => ({
        ...layerModelFixture(),
        slideNumber: index + 1,
      })),
    });
    const estimate = estimateDeckOpenPerformance(deckModels);

    expect(deckModels.length).toBe(10);
    expect(estimate.targetMs).toBe(5_000);
    expect(estimate.passed).toBe(true);
    expect(estimate.estimatedMs < 5_000).toBe(true);
  });
});

function layerModelFixture(): EditableLayerModel {
  return {
    slideNumber: 1,
    layers: [
      {
        id: "bg_1",
        type: "shape",
        role: "background",
        bounds: { x: 0, y: 0, w: 1600, h: 900 },
        editable: false,
      },
      {
        id: "title_1",
        type: "text",
        role: "title",
        text: "기존 제목",
        bounds: { x: 100, y: 80, w: 900, h: 120 },
        editable: true,
      },
      {
        id: "hero_1",
        type: "image",
        role: "hero",
        bounds: { x: 100, y: 260, w: 760, h: 360 },
        editable: true,
      },
      {
        id: "chart_1",
        type: "chart",
        role: "chart",
        bounds: { x: 1000, y: 400, w: 400, h: 300 },
        editable: true,
      },
    ],
  };
}
