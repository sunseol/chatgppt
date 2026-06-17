import { describe, expect, test } from "bun:test";
import type { EditableLayerModel } from "./deck-types";
import { applyDeckLayerTextEdit, serializeEditorLayersForExport } from "./editor-text-edit";

describe("editor text editing model", () => {
  test("updates an editable Korean title layer immutably", () => {
    const original = layerModelsFixture();
    const result = applyDeckLayerTextEdit(original, {
      slideNumber: 1,
      layerId: "title_1",
      text: "새 제목입니다",
    });

    expect(result.kind).toBe("updated");
    if (result.kind !== "updated") return;
    expect(original[0]?.layers[1]?.text).toBe("기존 제목");
    expect(result.models[0]?.layers[1]?.text).toBe("새 제목입니다");
    expect(result.updatedLayer.role).toBe("title");
    expect(result.exportPayload.layers[0]?.layers[1]?.text).toBe("새 제목입니다");
  });

  test("rejects locked and non-text layer edits", () => {
    const locked = applyDeckLayerTextEdit(layerModelsFixture(), {
      slideNumber: 1,
      layerId: "bg_1",
      text: "잠긴 배경",
    });
    const nonText = applyDeckLayerTextEdit(layerModelsFixture(), {
      slideNumber: 1,
      layerId: "chart_1",
      text: "차트 텍스트",
    });

    expect(locked).toEqual({ kind: "rejected", reason: "locked" });
    expect(nonText).toEqual({ kind: "rejected", reason: "not_text" });
  });

  test("serializes edited text into export-ready layer data", () => {
    const result = applyDeckLayerTextEdit(layerModelsFixture(), {
      slideNumber: 1,
      layerId: "body_1",
      text: "본문도 한글로 안전하게 저장됩니다.",
    });
    if (result.kind !== "updated") throw new Error("Expected updated edit result.");

    const payload = serializeEditorLayersForExport(result.models);
    const json = JSON.stringify(payload);

    expect(payload.type).toBe("editor_layers_export");
    expect(payload.layerCount).toBe(4);
    expect(json.includes("본문도 한글로 안전하게 저장됩니다.")).toBe(true);
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
          bounds: { x: 100, y: 80, w: 900, h: 120 },
          editable: true,
        },
        {
          id: "body_1",
          type: "text",
          role: "body",
          text: "기존 본문",
          bounds: { x: 100, y: 240, w: 900, h: 160 },
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
