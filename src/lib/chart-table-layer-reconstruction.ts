import type { PreparedChartDataRecord } from "./chart-data-pipeline";
import type { MvpEditableLayer, MvpEditableLayerModel } from "./editable-layer-model";

export type ChartTableLayerKind = "chart" | "table";
export type ChartTableFinalLayerSource = "data_editable_layer";
export type ChartTableLayerReconstructionIssueCode =
  | "missing_data_layer"
  | "dataset_mismatch"
  | "source_less_record";

export type GeneratedGraphCandidate = {
  readonly id: string;
  readonly slideNumber: number;
  readonly source: "generated_image_model";
  readonly description: string;
};

export type ReconstructedChartTableLayer = {
  readonly layerId: string;
  readonly sourceLayerId: string;
  readonly chartId: string;
  readonly kind: ChartTableLayerKind;
  readonly datasetId: string;
  readonly unit: string;
  readonly period: string;
  readonly baseYears: readonly number[];
  readonly sourceIds: readonly string[];
  readonly sourceMapIds: readonly string[];
  readonly bounds: MvpEditableLayer["bounds"];
  readonly editable: boolean;
  readonly qualityLevel: MvpEditableLayer["qualityLevel"];
  readonly chartOverlayId: string;
  readonly renderMode: PreparedChartDataRecord["renderMode"];
  readonly imageModelPolicy: string;
  readonly finalLayerSource: ChartTableFinalLayerSource;
};

export type ChartTableLayerReconstructionIssue = {
  readonly code: ChartTableLayerReconstructionIssueCode;
  readonly severity: "fatal";
  readonly chartId: string;
  readonly datasetId: string;
  readonly layerId?: string;
  readonly message: string;
};

export type ReconstructChartTableLayersInput = {
  readonly model: MvpEditableLayerModel;
  readonly records: readonly PreparedChartDataRecord[];
  readonly generatedGraphCandidates: readonly GeneratedGraphCandidate[];
};

export type ChartTableLayerReconstructionResult = {
  readonly slideNumber: number;
  readonly layers: readonly ReconstructedChartTableLayer[];
  readonly issues: readonly ChartTableLayerReconstructionIssue[];
  readonly fatalIssues: readonly ChartTableLayerReconstructionIssue[];
  readonly rejectedImageModelLayerIds: readonly string[];
};

export function reconstructChartTableLayers(
  input: ReconstructChartTableLayersInput,
): ChartTableLayerReconstructionResult {
  const layers: ReconstructedChartTableLayer[] = [];
  const issues: ChartTableLayerReconstructionIssue[] = [];

  input.records
    .filter((record) => record.slideNumber === input.model.slideNumber)
    .forEach((record) => {
      const editableLayer = findEditableDataLayer(input.model, record);
      if (editableLayer === undefined) {
        issues.push(missingDataLayerIssue(record));
        return;
      }
      if (!editableLayer.datasetIds.includes(record.datasetId)) {
        issues.push(datasetMismatchIssue(record, editableLayer.id));
        return;
      }
      if (record.sourceIds.length === 0) {
        issues.push(sourceLessRecordIssue(record, editableLayer.id));
        return;
      }

      layers.push(toReconstructedLayer(record, editableLayer));
    });

  return {
    slideNumber: input.model.slideNumber,
    layers,
    issues,
    fatalIssues: issues,
    rejectedImageModelLayerIds: input.generatedGraphCandidates
      .filter((candidate) => candidate.slideNumber === input.model.slideNumber)
      .map((candidate) => candidate.id),
  };
}

function findEditableDataLayer(
  model: MvpEditableLayerModel,
  record: PreparedChartDataRecord,
): MvpEditableLayer | undefined {
  const overlayMatch = model.layers.find(
    (layer) => layer.chartOverlayId === record.finalLayerBinding.chartOverlayId,
  );
  if (overlayMatch !== undefined) return overlayMatch;

  const placeholderMatch = model.layers.find(
    (layer) => layer.sourceLayerId === record.layoutBinding.placeholderId,
  );
  if (placeholderMatch !== undefined) return placeholderMatch;

  const kind = kindForRecord(record);
  return model.layers.find(
    (layer) =>
      layer.type === "chart" && layer.role === kind && layer.datasetIds.includes(record.datasetId),
  );
}

function toReconstructedLayer(
  record: PreparedChartDataRecord,
  layer: MvpEditableLayer,
): ReconstructedChartTableLayer {
  return {
    layerId: layer.id,
    sourceLayerId: layer.sourceLayerId,
    chartId: record.chartId,
    kind: kindForRecord(record),
    datasetId: record.datasetId,
    unit: record.unit,
    period: record.period,
    baseYears: [...record.baseYears],
    sourceIds: [...record.sourceIds],
    sourceMapIds: [...record.sourceMapIds],
    bounds: layer.bounds,
    editable: layer.editable,
    qualityLevel: layer.qualityLevel,
    chartOverlayId: record.finalLayerBinding.chartOverlayId,
    renderMode: record.renderMode,
    imageModelPolicy: record.imageModelPolicy,
    finalLayerSource: "data_editable_layer",
  };
}

function kindForRecord(record: PreparedChartDataRecord): ChartTableLayerKind {
  return record.chartType === "table" ? "table" : "chart";
}

function missingDataLayerIssue(
  record: PreparedChartDataRecord,
): ChartTableLayerReconstructionIssue {
  return {
    code: "missing_data_layer",
    severity: "fatal",
    chartId: record.chartId,
    datasetId: record.datasetId,
    message: `No editable chart/table layer found for ${record.chartId}.`,
  };
}

function datasetMismatchIssue(
  record: PreparedChartDataRecord,
  layerId: string,
): ChartTableLayerReconstructionIssue {
  return {
    code: "dataset_mismatch",
    severity: "fatal",
    chartId: record.chartId,
    datasetId: record.datasetId,
    layerId,
    message: `Editable chart/table layer ${layerId} does not carry dataset ${record.datasetId}.`,
  };
}

function sourceLessRecordIssue(
  record: PreparedChartDataRecord,
  layerId: string,
): ChartTableLayerReconstructionIssue {
  return {
    code: "source_less_record",
    severity: "fatal",
    chartId: record.chartId,
    datasetId: record.datasetId,
    layerId,
    message: `Prepared chart/table record ${record.chartId} has no source ids.`,
  };
}
