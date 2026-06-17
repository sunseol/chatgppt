import type { EditableLayerModel } from "./deck-types";

export interface EditorTransformCanvas {
  readonly width: number;
  readonly height: number;
}

export interface EditorSafeMargin {
  readonly x: number;
  readonly y: number;
}

export interface EditorMoveDelta {
  readonly x: number;
  readonly y: number;
}

export interface EditorResizeDelta {
  readonly w: number;
  readonly h: number;
}

export interface EditorMinSize {
  readonly w: number;
  readonly h: number;
}

export interface MoveDeckLayerInput {
  readonly slideNumber: number;
  readonly layerId: string;
  readonly delta: EditorMoveDelta;
  readonly canvas: EditorTransformCanvas;
  readonly safeMargin: EditorSafeMargin;
}

export interface ResizeDeckLayerInput {
  readonly slideNumber: number;
  readonly layerId: string;
  readonly delta: EditorResizeDelta;
  readonly canvas: EditorTransformCanvas;
  readonly safeMargin?: EditorSafeMargin;
  readonly minSize: EditorMinSize;
}

export interface EditorDragResponseEstimate {
  readonly targetMs: number;
  readonly estimatedMs: number;
  readonly passed: boolean;
}

export type EditorTransformRejectReason = "not_found" | "locked";

export type EditorTransformResult =
  | {
      readonly kind: "updated";
      readonly models: readonly EditableLayerModel[];
      readonly updatedLayer: EditableLayerModel["layers"][number];
    }
  | {
      readonly kind: "rejected";
      readonly reason: EditorTransformRejectReason;
    };

const SNAP_THRESHOLD = 16;

export function moveDeckLayer(
  models: readonly EditableLayerModel[],
  input: MoveDeckLayerInput,
): EditorTransformResult {
  const target = findLayer(models, input.slideNumber, input.layerId);
  if (!target) return { kind: "rejected", reason: "not_found" };
  if (!target.editable) return { kind: "rejected", reason: "locked" };
  const nextBounds = {
    ...target.bounds,
    x: snapToSafeMargin(
      clamp(target.bounds.x + input.delta.x, 0, input.canvas.width - target.bounds.w),
      input.safeMargin.x,
    ),
    y: snapToSafeMargin(
      clamp(target.bounds.y + input.delta.y, 0, input.canvas.height - target.bounds.h),
      input.safeMargin.y,
    ),
  };
  return updateLayerBounds(models, input.slideNumber, input.layerId, nextBounds);
}

export function resizeDeckLayer(
  models: readonly EditableLayerModel[],
  input: ResizeDeckLayerInput,
): EditorTransformResult {
  const target = findLayer(models, input.slideNumber, input.layerId);
  if (!target) return { kind: "rejected", reason: "not_found" };
  if (!target.editable) return { kind: "rejected", reason: "locked" };
  const rightMargin = input.safeMargin?.x ?? 0;
  const bottomMargin = input.safeMargin?.y ?? 0;
  const maxWidth = input.canvas.width - target.bounds.x - rightMargin;
  const maxHeight = input.canvas.height - target.bounds.y - bottomMargin;
  const nextBounds = {
    ...target.bounds,
    w: clamp(target.bounds.w + input.delta.w, input.minSize.w, maxWidth),
    h: clamp(target.bounds.h + input.delta.h, input.minSize.h, maxHeight),
  };
  return updateLayerBounds(models, input.slideNumber, input.layerId, nextBounds);
}

export function estimateEditorDragResponse(input: {
  readonly layerCount: number;
  readonly selectedLayerCount: number;
  readonly targetMs: number;
}): EditorDragResponseEstimate {
  const estimatedMs = Math.ceil(2 + input.selectedLayerCount * 2 + input.layerCount * 0.2);
  return {
    targetMs: input.targetMs,
    estimatedMs,
    passed: estimatedMs <= input.targetMs,
  };
}

function updateLayerBounds(
  models: readonly EditableLayerModel[],
  slideNumber: number,
  layerId: string,
  bounds: EditableLayerModel["layers"][number]["bounds"],
): EditorTransformResult {
  const next = models.map((model): EditableLayerModel => {
    if (model.slideNumber !== slideNumber) return model;
    return {
      ...model,
      layers: model.layers.map((layer) => (layer.id === layerId ? { ...layer, bounds } : layer)),
    };
  });
  const updatedLayer = findLayer(next, slideNumber, layerId);
  if (!updatedLayer) return { kind: "rejected", reason: "not_found" };
  return {
    kind: "updated",
    models: next,
    updatedLayer,
  };
}

function findLayer(
  models: readonly EditableLayerModel[],
  slideNumber: number,
  layerId: string,
): EditableLayerModel["layers"][number] | undefined {
  return models
    .find((model) => model.slideNumber === slideNumber)
    ?.layers.find((layer) => layer.id === layerId);
}

function snapToSafeMargin(value: number, margin: number): number {
  return Math.abs(value - margin) <= SNAP_THRESHOLD ? margin : value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
