import type { MvpEditableLayer, MvpEditableLayerModel } from "./editable-layer-model";
import type { DetectedVisualRegionLayer } from "./png2svg-visual-region-detector";

export interface OcrTextHint {
  readonly sourceLayerId: string;
  readonly text: string;
}

export interface MergeAdvancedLayerModelInput {
  readonly mvpModel: MvpEditableLayerModel;
  readonly visualRegions: readonly DetectedVisualRegionLayer[];
  readonly ocrTextHints: readonly OcrTextHint[];
}

export interface AdvancedLayerMergeResult {
  readonly model: MvpEditableLayerModel;
  readonly addedLayerCount: number;
  readonly ignoredOcrHintCount: number;
  readonly safeOverlayPathPreserved: boolean;
}

export interface AdvancedLayerBenchmarkSlide {
  readonly slideNumber: number;
  readonly oversegmentedRegionCount: number;
}

export interface AdvancedLayerMatchingScore {
  readonly slideCount: number;
  readonly unusableSlideCount: number;
  readonly unusableSlideRate: number;
  readonly targetUnusableSlideRate: 0.1;
  readonly passed: boolean;
}

const TARGET_UNUSABLE_SLIDE_RATE = 0.1;

export function mergeAdvancedLayerModel(
  input: MergeAdvancedLayerModelInput,
): AdvancedLayerMergeResult {
  const advancedLayers = input.visualRegions.map(toEditableRegionLayer);
  const model = {
    slideNumber: input.mvpModel.slideNumber,
    layers: [...input.mvpModel.layers, ...advancedLayers],
  };
  return {
    model,
    addedLayerCount: advancedLayers.length,
    ignoredOcrHintCount: ignoredOcrHintCount(input),
    safeOverlayPathPreserved: preservesOriginalOverlayPrefix(input.mvpModel, model),
  };
}

export function scoreAdvancedLayerMatching(
  slides: readonly AdvancedLayerBenchmarkSlide[],
): AdvancedLayerMatchingScore {
  const unusableSlideCount = slides.filter((slide) => slide.oversegmentedRegionCount > 0).length;
  const unusableSlideRate = slides.length === 0 ? 0 : unusableSlideCount / slides.length;
  return {
    slideCount: slides.length,
    unusableSlideCount,
    unusableSlideRate,
    targetUnusableSlideRate: TARGET_UNUSABLE_SLIDE_RATE,
    passed: unusableSlideRate <= TARGET_UNUSABLE_SLIDE_RATE,
  };
}

function toEditableRegionLayer(region: DetectedVisualRegionLayer): MvpEditableLayer {
  return {
    id: `editable_${region.id}`,
    sourceLayerId: region.sourceLayerId,
    type: region.type === "image_region" ? "image" : "shape",
    role: region.regionKind,
    bounds: region.bounds,
    editable: true,
    sourceIds: [],
    datasetIds: [],
    sourceMapIds: [region.sourceLayerId],
    qualityLevel: "level3",
  };
}

function ignoredOcrHintCount(input: MergeAdvancedLayerModelInput): number {
  const domTextSourceIds = new Set(
    input.mvpModel.layers
      .filter((layer) => layer.type === "text" && layer.text !== undefined)
      .map((layer) => layer.sourceLayerId),
  );
  return input.ocrTextHints.filter((hint) => domTextSourceIds.has(hint.sourceLayerId)).length;
}

function preservesOriginalOverlayPrefix(
  original: MvpEditableLayerModel,
  merged: MvpEditableLayerModel,
): boolean {
  return original.layers.every((layer, index) => merged.layers[index] === layer);
}
