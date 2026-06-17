import { describe, expect, test } from "bun:test";
import type { PreparedChartDataRecord } from "./chart-data-pipeline";
import type { GeneratedGraphCandidate } from "./chart-table-layer-reconstruction";
import type { MvpEditableLayer, MvpEditableLayerModel } from "./editable-layer-model";
import { reconstructChartTableLayers } from "./chart-table-layer-reconstruction";

describe("chart and table layer reconstruction", () => {
  test("reconstructs source-backed chart and table layers from prepared data", () => {
    // Given
    const model = editableModelFixture([chartLayerFixture("chart"), chartLayerFixture("table")]);
    const records = [recordFixture("bar", "chart"), recordFixture("table", "table")];

    // When
    const result = reconstructChartTableLayers({
      model,
      records,
      generatedGraphCandidates: [generatedGraphCandidateFixture()],
    });

    // Then
    expect(result.fatalIssues).toEqual([]);
    expect(result.rejectedImageModelLayerIds).toEqual(["generated_fake_graph_1"]);
    expect(result.layers.map((layer) => layer.kind)).toEqual(["chart", "table"]);
    expect(result.layers.every((layer) => layer.finalLayerSource === "data_editable_layer")).toBe(
      true,
    );
    expect(result.layers.map((layer) => layer.datasetId)).toEqual([
      "dataset_chart",
      "dataset_table",
    ]);
    expect(result.layers[0]?.unit).toBe("%");
    expect(result.layers[0]?.period).toBe("2023-2025");
    expect(result.layers[0]?.baseYears).toEqual([2023, 2024, 2025]);
    expect(result.layers[0]?.sourceIds).toEqual(["src_001"]);
    expect(result.layers[0]?.sourceMapIds).toEqual(["claim_001", "src_001", "dataset_chart"]);
  });

  test("rejects editable chart layers that do not carry the prepared dataset id", () => {
    // Given
    const model = editableModelFixture([{ ...chartLayerFixture("chart"), datasetIds: [] }]);

    // When
    const result = reconstructChartTableLayers({
      model,
      records: [recordFixture("line", "chart")],
      generatedGraphCandidates: [],
    });

    // Then
    expect(result.layers).toEqual([]);
    expect(result.fatalIssues).toEqual([
      {
        code: "dataset_mismatch",
        severity: "fatal",
        chartId: "chart_001",
        datasetId: "dataset_chart",
        layerId: "editable_chart",
        message: "Editable chart/table layer editable_chart does not carry dataset dataset_chart.",
      },
    ]);
  });
});

function editableModelFixture(layers: readonly MvpEditableLayer[]): MvpEditableLayerModel {
  return {
    slideNumber: 3,
    layers: [...layers],
  };
}

function chartLayerFixture(kind: "chart" | "table"): MvpEditableLayer {
  const datasetId = kind === "chart" ? "dataset_chart" : "dataset_table";
  return {
    id: `editable_${kind}`,
    sourceLayerId: `slide_3_${kind}`,
    type: "chart",
    role: kind,
    bounds: { x: 96, y: 252, w: 840, h: 520 },
    editable: true,
    sourceIds: ["src_001"],
    datasetIds: [datasetId],
    sourceMapIds: ["claim_001", "src_001", datasetId],
    qualityLevel: "level2",
    chartOverlayId: `overlay_${kind}_001_slide_03`,
  };
}

function recordFixture(
  chartType: "bar" | "line" | "table",
  kind: "chart" | "table",
): PreparedChartDataRecord {
  const datasetId = kind === "chart" ? "dataset_chart" : "dataset_table";
  return {
    chartId: `${kind}_001`,
    chartType,
    datasetId,
    slideId: "slide_03",
    slideNumber: 3,
    unit: kind === "chart" ? "%" : "count",
    period: kind === "chart" ? "2023-2025" : "2025",
    baseYears: kind === "chart" ? [2023, 2024, 2025] : [2025],
    sourceIds: ["src_001"],
    sourceMapIds: ["claim_001", "src_001", datasetId],
    layoutBinding: {
      chartId: `${kind}_001`,
      placeholderId: `slide_3_${kind}`,
    },
    finalLayerBinding: {
      chartId: `${kind}_001`,
      chartOverlayId: `overlay_${kind}_001_slide_03`,
    },
    renderMode: "editable_overlay",
    imageModelPolicy:
      "Image model must not draw chart values; leave placeholder for DeckForge editable overlay rendering.",
  };
}

function generatedGraphCandidateFixture(): GeneratedGraphCandidate {
  return {
    id: "generated_fake_graph_1",
    slideNumber: 3,
    source: "generated_image_model",
    description: "A graph-like background region drawn by the image model.",
  };
}
