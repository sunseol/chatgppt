import { describe, expect, test } from "bun:test";
import type { EditableLayerModel } from "./deck-types";
import { buildCanvaCompatibilityPackage } from "./canva-package";

describe("canva package", () => {
  test("documents compatibility limits while preserving supported editable layers", () => {
    const pkg = buildCanvaCompatibilityPackage({
      projectId: "project_001",
      layers: layerModels(),
      exportedAt: 120,
    });

    expect(pkg.manifest.format).toBe("deckforge_canva_import_package");
    expect(pkg.manifest.limitations.length > 0).toBe(true);
    expect(pkg.manifest.limitations.some((note) => note.includes("charts"))).toBe(true);
    expect(pkg.slides[0].layers.map((layer) => [layer.id, layer.editable])).toEqual([
      ["title_1", true],
      ["shape_1", true],
      ["chart_1", false],
      ["image_1", true],
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
        {
          id: "image_1",
          type: "image",
          role: "hero",
          bounds: { x: 980, y: 210, w: 420, h: 360 },
          editable: false,
        },
      ],
    },
  ];
}
