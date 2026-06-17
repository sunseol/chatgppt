import { describe, expect, test } from "bun:test";
import type { EditableLayerModel } from "./deck-types";
import { evaluateEditableReviewGate } from "./editable-review-gate";

describe("editable review gate", () => {
  test("blocks approval when no editable layer output exists", () => {
    // Given
    const layers: readonly EditableLayerModel[] = [];

    // When
    const report = evaluateEditableReviewGate(layers);

    // Then
    expect(report.canApprove).toBe(false);
    expect(report.status).toBe("blocked");
    expect(report.failures).toEqual([
      {
        code: "missing_layers",
        severity: "fatal",
        message: "No SVG/layer conversion output is available for review.",
      },
    ]);
  });

  test("blocks approval and names slides that have no editable layers", () => {
    // Given
    const layers: readonly EditableLayerModel[] = [
      {
        slideNumber: 2,
        layers: [
          {
            id: "bg_2",
            type: "shape",
            role: "background",
            bounds: { x: 0, y: 0, w: 1600, h: 900 },
            editable: false,
          },
        ],
      },
    ];

    // When
    const report = evaluateEditableReviewGate(layers);

    // Then
    expect(report.canApprove).toBe(false);
    expect(report.failures[0]?.code).toBe("slide_without_editable_layers");
    expect(report.failures[0]?.slideNumber).toBe(2);
    expect(report.failures[0]?.message).toBe("Slide 2 has no editable layers.");
  });

  test("allows approval when every slide has editable layer output", () => {
    // Given
    const layers: readonly EditableLayerModel[] = [
      {
        slideNumber: 1,
        layers: [
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
    ];

    // When
    const report = evaluateEditableReviewGate(layers);

    // Then
    expect(report.canApprove).toBe(true);
    expect(report.status).toBe("passed");
    expect(report.totalLayers).toBe(1);
    expect(report.editableLayers).toBe(1);
    expect(report.editableRatio).toBe(100);
  });
});
