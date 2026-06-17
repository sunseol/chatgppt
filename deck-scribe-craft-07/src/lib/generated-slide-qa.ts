import type { MvpEditableLayer, MvpEditableLayerModel } from "./editable-layer-model";
import type { FinalSlideComposition } from "./final-slide-compositor";
import type { SlideImageAspectRatio } from "./slide-image-provider";

export const GENERATED_SLIDE_QA_THRESHOLDS = {
  structureMismatchRate: 0.1,
  minReadableTextHeight: 24,
} as const;

export interface GeneratedSlideQaMetrics {
  readonly sourceLessNumberCount: number;
  readonly unreadableTextLayerCount: number;
  readonly structureMismatchRate: number;
}

export interface GeneratedSlideQaReport {
  readonly status: "passed" | "failed";
  readonly metrics: GeneratedSlideQaMetrics;
  readonly issues: readonly string[];
}

export function validateGeneratedSlideComposition(input: {
  readonly composition: FinalSlideComposition;
  readonly layers: MvpEditableLayerModel;
  readonly expectedAspectRatio: SlideImageAspectRatio;
}): GeneratedSlideQaReport {
  const issues: string[] = [];
  addAspectIssue(input.composition, input.expectedAspectRatio, issues);
  addSourceLessNumberIssues(input.layers.layers, issues);
  addReadabilityIssues(input.layers.layers, issues);
  const structureMismatchRate = structureMismatchRateForLayers(input.layers.layers);
  if (structureMismatchRate > GENERATED_SLIDE_QA_THRESHOLDS.structureMismatchRate) {
    issues.push(`Layout structure mismatch rate ${formatRate(structureMismatchRate)} exceeds 10%.`);
  }

  return {
    status: issues.length === 0 ? "passed" : "failed",
    metrics: {
      sourceLessNumberCount: sourceLessNumberCount(input.layers.layers),
      unreadableTextLayerCount: unreadableTextLayerCount(input.layers.layers),
      structureMismatchRate,
    },
    issues,
  };
}

function addAspectIssue(
  composition: FinalSlideComposition,
  expected: SlideImageAspectRatio,
  issues: string[],
) {
  const actual = aspectRatioName(composition);
  if (actual !== expected) {
    issues.push(`Composition aspect ratio ${actual} does not match expected ${expected}.`);
  }
}

function addSourceLessNumberIssues(layers: readonly MvpEditableLayer[], issues: string[]) {
  for (const layer of layers) {
    if (isSourceLessNumberLayer(layer)) {
      issues.push(`Layer ${layer.id} contains a number without source map ids.`);
    }
  }
}

function addReadabilityIssues(layers: readonly MvpEditableLayer[], issues: string[]) {
  for (const layer of layers) {
    if (
      layer.type === "text" &&
      layer.bounds.h < GENERATED_SLIDE_QA_THRESHOLDS.minReadableTextHeight
    ) {
      issues.push(`Layer ${layer.id} text bounds are too small to read.`);
    }
  }
}

function sourceLessNumberCount(layers: readonly MvpEditableLayer[]): number {
  return layers.filter(isSourceLessNumberLayer).length;
}

function unreadableTextLayerCount(layers: readonly MvpEditableLayer[]): number {
  return layers.filter(
    (layer) =>
      layer.type === "text" && layer.bounds.h < GENERATED_SLIDE_QA_THRESHOLDS.minReadableTextHeight,
  ).length;
}

function isSourceLessNumberLayer(layer: MvpEditableLayer): boolean {
  return layer.type === "text" && /\d/.test(layer.text ?? "") && layer.sourceMapIds.length === 0;
}

function structureMismatchRateForLayers(layers: readonly MvpEditableLayer[]): number {
  if (layers.length === 0) return 0;
  const mismatches = layers.filter(hasStructureMismatch).length;
  return mismatches / layers.length;
}

function hasStructureMismatch(layer: MvpEditableLayer): boolean {
  return layer.sourceLayerId.startsWith("missing");
}

function aspectRatioName(composition: FinalSlideComposition): SlideImageAspectRatio {
  const ratio = composition.canvas.width / composition.canvas.height;
  return Math.abs(ratio - 16 / 9) < 0.02 ? "16:9" : "4:3";
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
