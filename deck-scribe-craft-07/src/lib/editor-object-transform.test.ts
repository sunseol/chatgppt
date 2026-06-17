import { describe, expect, test } from "bun:test";
import type { EditableLayerModel } from "./deck-types";
import {
  estimateEditorDragResponse,
  moveDeckLayer,
  resizeDeckLayer,
} from "./editor-object-transform";

describe("editor object transform model", () => {
  test("moves an editable layer and snaps near the safe margin", () => {
    const result = moveDeckLayer(layerModelsFixture(), {
      slideNumber: 1,
      layerId: "title_1",
      delta: { x: -14, y: -12 },
      canvas: { width: 1600, height: 900 },
      safeMargin: { x: 96, y: 72 },
    });

    expect(result.kind).toBe("updated");
    if (result.kind !== "updated") return;
    expect(result.updatedLayer.bounds.x).toBe(96);
    expect(result.updatedLayer.bounds.y).toBe(72);
    expect(result.models[0]?.layers[1]?.bounds.x).toBe(96);
  });

  test("resizes an editable layer while clamping to canvas bounds", () => {
    const result = resizeDeckLayer(layerModelsFixture(), {
      slideNumber: 1,
      layerId: "chart_1",
      delta: { w: 500, h: 500 },
      canvas: { width: 1600, height: 900 },
      safeMargin: { x: 96, y: 72 },
      minSize: { w: 48, h: 32 },
    });

    expect(result.kind).toBe("updated");
    if (result.kind !== "updated") return;
    expect(result.updatedLayer.bounds.w).toBe(504);
    expect(result.updatedLayer.bounds.h).toBe(468);
  });

  test("rejects locked layer transforms", () => {
    const result = moveDeckLayer(layerModelsFixture(), {
      slideNumber: 1,
      layerId: "bg_1",
      delta: { x: 10, y: 10 },
      canvas: { width: 1600, height: 900 },
      safeMargin: { x: 96, y: 72 },
    });

    expect(result).toEqual({ kind: "rejected", reason: "locked" });
  });

  test("keeps estimated drag response below the interaction target", () => {
    const estimate = estimateEditorDragResponse({
      layerCount: 40,
      selectedLayerCount: 1,
      targetMs: 16,
    });

    expect(estimate.estimatedMs <= 16).toBe(true);
    expect(estimate.passed).toBe(true);
  });
});

function layerModelsFixture(): readonly EditableLayerModel[] {
  return [
    {
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
          bounds: { x: 110, y: 84, w: 900, h: 120 },
          editable: true,
        },
        {
          id: "chart_1",
          type: "chart",
          role: "chart",
          bounds: { x: 1000, y: 360, w: 420, h: 320 },
          editable: true,
        },
      ],
    },
  ];
}
