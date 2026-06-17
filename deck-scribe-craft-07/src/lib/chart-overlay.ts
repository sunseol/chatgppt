import type {
  ChartType,
  LayoutPrototype,
  ResearchChart,
  ResearchDataset,
  ResearchDatasetRow,
  ResearchPack,
} from "./deck-types";
import type { MinimalSlideSourceMap } from "./slide-source-map";
import { createSlidePromptSourceMapReference } from "./slide-source-map";
export { renderBasicChartOverlaySvg } from "./chart-overlay-renderer";

export type BasicChartOverlayType = Extract<ChartType, "bar" | "line">;
export type ChartOverlayIssueCode =
  | "missing_dataset"
  | "missing_placeholder"
  | "source_less_dataset"
  | "unsupported_chart";

export interface ChartOverlayIssue {
  readonly code: ChartOverlayIssueCode;
  readonly severity: "fatal" | "warning";
  readonly chartId: string;
  readonly message: string;
  readonly slideId?: string;
  readonly datasetId?: string;
}

export interface ChartOverlayRow {
  readonly label: string;
  readonly value: number;
  readonly year?: number;
  readonly segment?: string;
}

export interface BasicChartOverlay {
  readonly id: string;
  readonly chartId: string;
  readonly chartType: BasicChartOverlayType;
  readonly slideId: string;
  readonly slideNumber: number;
  readonly placeholderId: string;
  readonly datasetId: string;
  readonly unit: string;
  readonly period: string;
  readonly sourceIds: readonly string[];
  readonly sourceMapIds: readonly string[];
  readonly rows: readonly ChartOverlayRow[];
}

export interface BasicChartOverlayResult {
  readonly overlays: readonly BasicChartOverlay[];
  readonly issues: readonly ChartOverlayIssue[];
  readonly fatalIssues: readonly ChartOverlayIssue[];
}

export interface BuildBasicChartOverlayInput {
  readonly research: ResearchPack;
  readonly layout: LayoutPrototype;
  readonly sourceMap: MinimalSlideSourceMap;
}

export function buildBasicChartOverlays(
  input: BuildBasicChartOverlayInput,
): BasicChartOverlayResult {
  const datasets = new Map(input.research.datasets.map((dataset) => [dataset.id, dataset]));
  const overlays: BasicChartOverlay[] = [];
  const issues: ChartOverlayIssue[] = [];

  for (const chart of input.research.charts) {
    if (!isBasicChartType(chart.chartType)) {
      issues.push(unsupportedChartIssue(chart));
      continue;
    }
    const chartType = chart.chartType;

    const dataset = datasets.get(chart.datasetId);
    if (!dataset) {
      issues.push(missingDatasetIssue(chart));
      continue;
    }

    chart.slideCandidates.forEach((slideNumber) => {
      const overlay = createOverlay(chart, chartType, dataset, slideNumber, input, issues);
      if (overlay) overlays.push(overlay);
    });
  }

  const fatalIssues = issues.filter((issue) => issue.severity === "fatal");
  return {
    overlays: Object.freeze(overlays),
    issues: Object.freeze(issues),
    fatalIssues: Object.freeze(fatalIssues),
  };
}

function createOverlay(
  chart: ResearchChart,
  chartType: BasicChartOverlayType,
  dataset: ResearchDataset,
  slideNumber: number,
  input: BuildBasicChartOverlayInput,
  issues: ChartOverlayIssue[],
): BasicChartOverlay | undefined {
  const slideId = formatSlideId(slideNumber);
  const placeholderId = findChartPlaceholder(input.layout, slideNumber);
  if (!placeholderId) {
    issues.push({
      code: "missing_placeholder",
      severity: "fatal",
      chartId: chart.id,
      datasetId: dataset.id,
      slideId,
      message: `Chart ${chart.id} cannot render without a chart placeholder on ${slideId}.`,
    });
    return undefined;
  }

  const sourceIds = unique([...chart.sourceIds, ...dataset.sourceIds]);
  if (sourceIds.length === 0) {
    issues.push({
      code: "source_less_dataset",
      severity: "fatal",
      chartId: chart.id,
      datasetId: dataset.id,
      slideId,
      message: `Chart ${chart.id} cannot render without dataset/source metadata.`,
    });
    return undefined;
  }

  const sourceMapIds = sourceMapIdsForSlide(input.sourceMap, slideId, sourceIds, dataset.id);
  return {
    id: `overlay_${chart.id}_${slideId}`,
    chartId: chart.id,
    chartType,
    slideId,
    slideNumber,
    placeholderId,
    datasetId: dataset.id,
    unit: chart.unit || dataset.unit,
    period: chart.period || dataset.period,
    sourceIds,
    sourceMapIds,
    rows: Object.freeze(dataset.rows.map(toOverlayRow)),
  };
}

function sourceMapIdsForSlide(
  sourceMap: MinimalSlideSourceMap,
  slideId: string,
  sourceIds: readonly string[],
  datasetId: string,
): readonly string[] {
  const entry = sourceMap.entries.find((item) => item.slideId === slideId);
  if (!entry) return unique([...sourceIds, datasetId]);
  const reference = createSlidePromptSourceMapReference(entry);
  return unique([...reference.sourceMapIds, ...sourceIds, datasetId]);
}

function findChartPlaceholder(layout: LayoutPrototype, slideNumber: number): string | undefined {
  const slide = layout.slides.find((item) => item.number === slideNumber);
  const layer = slide?.domLayers.find((item) => item.role === "chart");
  return layer?.id;
}

function toOverlayRow(row: ResearchDatasetRow): ChartOverlayRow {
  return {
    label: row.label,
    value: row.value,
    ...(row.year === undefined ? {} : { year: row.year }),
    ...(row.segment === undefined ? {} : { segment: row.segment }),
  };
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function formatSlideId(slideNumber: number): string {
  return `slide_${String(slideNumber).padStart(2, "0")}`;
}

function isBasicChartType(chartType: ChartType): chartType is BasicChartOverlayType {
  return chartType === "bar" || chartType === "line";
}

function missingDatasetIssue(chart: ResearchChart): ChartOverlayIssue {
  return {
    code: "missing_dataset",
    severity: "fatal",
    chartId: chart.id,
    datasetId: chart.datasetId,
    message: `Chart ${chart.id} references missing dataset ${chart.datasetId}.`,
  };
}

function unsupportedChartIssue(chart: ResearchChart): ChartOverlayIssue {
  return {
    code: "unsupported_chart",
    severity: "warning",
    chartId: chart.id,
    datasetId: chart.datasetId,
    message: `Chart ${chart.id} uses unsupported MVP chart type ${chart.chartType}.`,
  };
}
