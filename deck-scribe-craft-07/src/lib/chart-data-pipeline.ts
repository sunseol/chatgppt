import type {
  ChartType,
  LayoutPrototype,
  ResearchChart,
  ResearchDataset,
  ResearchPack,
} from "./deck-types";
import type { MinimalSlideSourceMap } from "./slide-source-map";
import { createSlidePromptSourceMapReference } from "./slide-source-map";

export type ChartDataPipelineIssueCode =
  | "missing_dataset"
  | "missing_placeholder"
  | "source_less_dataset";

export type ChartRenderMode = "editable_overlay";

export type ChartDataPipelineIssue = {
  readonly code: ChartDataPipelineIssueCode;
  readonly severity: "fatal";
  readonly chartId: string;
  readonly datasetId: string;
  readonly slideId?: string;
  readonly message: string;
};

export type ChartLayoutBinding = {
  readonly chartId: string;
  readonly placeholderId: string;
};

export type ChartFinalLayerBinding = {
  readonly chartId: string;
  readonly chartOverlayId: string;
};

export type PreparedChartDataRecord = {
  readonly chartId: string;
  readonly chartType: ChartType;
  readonly datasetId: string;
  readonly slideId: string;
  readonly slideNumber: number;
  readonly unit: string;
  readonly period: string;
  readonly baseYears: readonly number[];
  readonly sourceIds: readonly string[];
  readonly sourceMapIds: readonly string[];
  readonly layoutBinding: ChartLayoutBinding;
  readonly finalLayerBinding: ChartFinalLayerBinding;
  readonly renderMode: ChartRenderMode;
  readonly imageModelPolicy: string;
};

export type ChartDataPipelineResult = {
  readonly records: readonly PreparedChartDataRecord[];
  readonly issues: readonly ChartDataPipelineIssue[];
  readonly fatalIssues: readonly ChartDataPipelineIssue[];
};

export type PrepareChartDataPipelineInput = {
  readonly research: ResearchPack;
  readonly layout: LayoutPrototype;
  readonly sourceMap: MinimalSlideSourceMap;
};

export function prepareChartDataPipeline(
  input: PrepareChartDataPipelineInput,
): ChartDataPipelineResult {
  const datasets = new Map(input.research.datasets.map((dataset) => [dataset.id, dataset]));
  const records: PreparedChartDataRecord[] = [];
  const issues: ChartDataPipelineIssue[] = [];

  input.research.charts.forEach((chart) => {
    const dataset = datasets.get(chart.datasetId);
    if (dataset === undefined) {
      issues.push(missingDatasetIssue(chart));
      return;
    }
    chart.slideCandidates.forEach((slideNumber) => {
      const record = prepareChartSlideRecord(chart, dataset, slideNumber, input, issues);
      if (record !== undefined) records.push(record);
    });
  });

  return {
    records,
    issues,
    fatalIssues: issues,
  };
}

function prepareChartSlideRecord(
  chart: ResearchChart,
  dataset: ResearchDataset,
  slideNumber: number,
  input: PrepareChartDataPipelineInput,
  issues: ChartDataPipelineIssue[],
): PreparedChartDataRecord | undefined {
  const slideId = formatSlideId(slideNumber);
  const placeholderId = findChartPlaceholder(input.layout, slideNumber);
  const sourceIds = unique([...chart.sourceIds, ...dataset.sourceIds]);

  let hasFatalIssue = false;
  if (placeholderId === undefined) {
    issues.push(missingPlaceholderIssue(chart, dataset.id, slideId));
    hasFatalIssue = true;
  }
  if (sourceIds.length === 0) {
    issues.push(sourceLessDatasetIssue(chart, dataset.id, slideId));
    hasFatalIssue = true;
  }
  if (hasFatalIssue || placeholderId === undefined) return undefined;

  const overlayId = formatChartOverlayId(chart.id, slideId);
  return {
    chartId: chart.id,
    chartType: chart.chartType,
    datasetId: dataset.id,
    slideId,
    slideNumber,
    unit: chart.unit || dataset.unit,
    period: chart.period || dataset.period,
    baseYears: datasetBaseYears(dataset),
    sourceIds,
    sourceMapIds: sourceMapIdsForSlide(input.sourceMap, slideId, sourceIds, dataset.id),
    layoutBinding: {
      chartId: chart.id,
      placeholderId,
    },
    finalLayerBinding: {
      chartId: chart.id,
      chartOverlayId: overlayId,
    },
    renderMode: "editable_overlay",
    imageModelPolicy: `Image model must not draw chart values for ${chart.id}; leave placeholder ${placeholderId} for DeckForge editable overlay rendering.`,
  };
}

function findChartPlaceholder(layout: LayoutPrototype, slideNumber: number): string | undefined {
  const slide = layout.slides.find((item) => item.number === slideNumber);
  const layer = slide?.domLayers.find((item) => item.role === "chart");
  return layer?.id;
}

function sourceMapIdsForSlide(
  sourceMap: MinimalSlideSourceMap,
  slideId: string,
  sourceIds: readonly string[],
  datasetId: string,
): readonly string[] {
  const entry = sourceMap.entries.find((item) => item.slideId === slideId);
  if (entry === undefined) return unique([...sourceIds, datasetId]);
  const reference = createSlidePromptSourceMapReference(entry);
  return unique([...reference.sourceMapIds, ...sourceIds, datasetId]);
}

function datasetBaseYears(dataset: ResearchDataset): readonly number[] {
  const years: number[] = [];
  dataset.rows.forEach((row) => {
    if (row.year !== undefined && !years.includes(row.year)) years.push(row.year);
  });
  return years;
}

function missingDatasetIssue(chart: ResearchChart): ChartDataPipelineIssue {
  return {
    code: "missing_dataset",
    severity: "fatal",
    chartId: chart.id,
    datasetId: chart.datasetId,
    message: `Chart ${chart.id} references missing dataset ${chart.datasetId}.`,
  };
}

function missingPlaceholderIssue(
  chart: ResearchChart,
  datasetId: string,
  slideId: string,
): ChartDataPipelineIssue {
  return {
    code: "missing_placeholder",
    severity: "fatal",
    chartId: chart.id,
    datasetId,
    slideId,
    message: `Chart ${chart.id} cannot bind to a layout chart placeholder on ${slideId}.`,
  };
}

function sourceLessDatasetIssue(
  chart: ResearchChart,
  datasetId: string,
  slideId: string,
): ChartDataPipelineIssue {
  return {
    code: "source_less_dataset",
    severity: "fatal",
    chartId: chart.id,
    datasetId,
    slideId,
    message: `Chart ${chart.id} cannot render without dataset/source metadata.`,
  };
}

function formatChartOverlayId(chartId: string, slideId: string): string {
  return `overlay_${chartId}_${slideId}`;
}

function formatSlideId(slideNumber: number): string {
  return `slide_${String(slideNumber).padStart(2, "0")}`;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
