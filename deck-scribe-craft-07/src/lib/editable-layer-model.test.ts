import { describe, expect, test } from "bun:test";
import { EDITABILITY_QUALITY_LEVELS, MvpEditableLayerModelSchema } from "./editable-layer-model";

describe("editable layer model schema", () => {
  test("parses complete source-backed layer metadata", () => {
    const parsed = MvpEditableLayerModelSchema.parse({
      slideNumber: 3,
      layers: [
        {
          id: "editable_slide_3_chart",
          sourceLayerId: "slide_3_chart",
          type: "chart",
          role: "chart",
          bounds: { x: 96, y: 252, w: 1728, h: 676 },
          editable: true,
          sourceIds: ["src_001"],
          datasetIds: ["dataset_001"],
          sourceMapIds: ["claim_001", "src_001", "dataset_001"],
          qualityLevel: "level2",
        },
      ],
    });

    expect(parsed.layers[0]?.sourceLayerId).toBe("slide_3_chart");
    expect(parsed.layers[0]?.datasetIds).toEqual(["dataset_001"]);
  });

  test("rejects invalid bounds", () => {
    const result = MvpEditableLayerModelSchema.safeParse({
      slideNumber: 1,
      layers: [
        {
          id: "bad",
          sourceLayerId: "source",
          type: "text",
          role: "title",
          bounds: { x: 0, y: 0, w: 0, h: 100 },
          editable: true,
          sourceIds: [],
          datasetIds: [],
          sourceMapIds: [],
          qualityLevel: "level2",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("documents Level 2 and Level 3 editability targets", () => {
    expect(EDITABILITY_QUALITY_LEVELS.level2.includes("DOM")).toBe(true);
    expect(EDITABILITY_QUALITY_LEVELS.level3.includes("object")).toBe(true);
  });
});
