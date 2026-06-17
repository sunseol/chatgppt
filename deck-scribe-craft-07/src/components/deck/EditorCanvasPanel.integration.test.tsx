import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorCanvasPanel } from "./EditorCanvasPanel";
import { buildEditorCanvasModel } from "@/lib/editor-canvas-model";

describe("editor canvas panel", () => {
  test("renders selectable layer nodes with locked state", () => {
    const model = buildEditorCanvasModel({
      canvas: { width: 1600, height: 900 },
      layerModel: {
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
            text: "편집 가능한 제목",
            bounds: { x: 96, y: 96, w: 900, h: 120 },
            editable: true,
          },
        ],
      },
    });

    const markup = renderToStaticMarkup(
      <EditorCanvasPanel model={model} selectedLayerId="title_1" onSelectLayer={() => undefined} />,
    );

    expect(markup.includes('data-editor-canvas="1"')).toBe(true);
    expect(markup.includes('data-canvas-layer="bg_1"')).toBe(true);
    expect(markup.includes('data-locked="true"')).toBe(true);
    expect(markup.includes('data-canvas-layer="title_1"')).toBe(true);
    expect(markup.includes('data-resize-handle="title_1"')).toBe(true);
    expect(markup.includes("편집 가능한 제목")).toBe(true);
  });
});
