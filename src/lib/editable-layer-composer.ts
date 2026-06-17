import type { BasicChartOverlay } from "./chart-overlay";
import {
  MvpEditableLayerModelSchema,
  type MvpEditableLayer,
  type MvpEditableLayerModel,
} from "./editable-layer-model";
import type { SlideContextBundle } from "./slide-context-bundle";
import { buildTextOverlayStrategy, type TextOverlayStrategyLayer } from "./text-overlay-strategy";

export interface ComposeMvpEditableLayersInput {
  readonly bundle: SlideContextBundle;
  readonly chartOverlays: readonly BasicChartOverlay[];
}

export interface MvpEditabilityScore {
  readonly qualityLevel: "level2";
  readonly titleEditableRate: number;
  readonly bodyEditableRate: number;
  readonly passed: boolean;
}

export function composeMvpEditableLayers(
  input: ComposeMvpEditableLayersInput,
): MvpEditableLayerModel {
  const strategy = buildTextOverlayStrategy(input.bundle);
  const layers = strategy.layers
    .filter((layer) => layer.renderedBy !== "generated-visual-background")
    .map((layer) => composeLayer(layer, input.bundle, input.chartOverlays));

  return MvpEditableLayerModelSchema.parse({
    slideNumber: input.bundle.slideSpec.slideNumber,
    layers,
  });
}

export function scoreMvpEditability(models: readonly MvpEditableLayerModel[]): MvpEditabilityScore {
  const total = models.length;
  const titleEditableRate = total === 0 ? 1 : editableRoleRate(models, "title");
  const bodyEditableRate = total === 0 ? 1 : editableRoleRate(models, "body");
  return {
    qualityLevel: "level2",
    titleEditableRate,
    bodyEditableRate,
    passed: titleEditableRate >= 0.95 && bodyEditableRate >= 0.85,
  };
}

function composeLayer(
  layer: TextOverlayStrategyLayer,
  bundle: SlideContextBundle,
  chartOverlays: readonly BasicChartOverlay[],
): MvpEditableLayer {
  const chartOverlay = findChartOverlay(layer, chartOverlays);
  return {
    id: `editable_${layer.id}`,
    sourceLayerId: layer.id,
    type: layer.role === "chart" || layer.role === "table" ? "chart" : "text",
    role: layer.role,
    bounds: layer.bounds,
    editable: true,
    ...(textForLayer(layer.role, bundle) === undefined
      ? {}
      : { text: textForLayer(layer.role, bundle) }),
    sourceIds: [...sourceIdsForLayer(layer, bundle, chartOverlay)],
    datasetIds: [...datasetIdsForLayer(layer, bundle, chartOverlay)],
    sourceMapIds: [...layer.sourceMapIds],
    qualityLevel: "level2",
    ...(chartOverlay === undefined ? {} : { chartOverlayId: chartOverlay.id }),
  };
}

function findChartOverlay(
  layer: TextOverlayStrategyLayer,
  chartOverlays: readonly BasicChartOverlay[],
): BasicChartOverlay | undefined {
  if (layer.role !== "chart") return undefined;
  return chartOverlays.find((overlay) => overlay.placeholderId === layer.id);
}

function textForLayer(role: string, bundle: SlideContextBundle): string | undefined {
  if (role === "title") return bundle.slideSpec.title;
  if (role === "body") return bundle.slideSpec.message;
  if (role === "source") return `Sources: ${joinOrNone(bundle.sourceMap.sourceIds)}`;
  if (role === "caption") return bundle.slideSpec.visualType;
  if (role === "metric") return bundle.facts[0]?.text ?? bundle.slideSpec.message;
  if (role === "cta" || role === "sectionMarker" || role === "subtitle") {
    return bundle.slideSpec.message;
  }
  return undefined;
}

function sourceIdsForLayer(
  layer: TextOverlayStrategyLayer,
  bundle: SlideContextBundle,
  chartOverlay: BasicChartOverlay | undefined,
): readonly string[] {
  if (chartOverlay) return chartOverlay.sourceIds;
  if (layer.role === "source") return bundle.sourceMap.sourceIds;
  return layer.sourceIds;
}

function datasetIdsForLayer(
  layer: TextOverlayStrategyLayer,
  bundle: SlideContextBundle,
  chartOverlay: BasicChartOverlay | undefined,
): readonly string[] {
  if (chartOverlay) return [chartOverlay.datasetId];
  if (layer.datasetIds.length > 0) return layer.datasetIds;
  if (layer.role === "source") return bundle.sourceMap.datasetIds;
  return [];
}

function editableRoleRate(models: readonly MvpEditableLayerModel[], role: string): number {
  const editableCount = models.filter((model) =>
    model.layers.some((layer) => layer.role === role && layer.editable),
  ).length;
  return editableCount / models.length;
}

function joinOrNone(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}
