export type EditorCanvasLayerType = "text" | "shape" | "image" | "chart";

export interface EditorCanvasBounds {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface EditorCanvasLayerInput {
  readonly id: string;
  readonly type: EditorCanvasLayerType;
  readonly role: string;
  readonly bounds: EditorCanvasBounds;
  readonly editable: boolean;
  readonly text?: string;
}

export interface EditorCanvasLayerModelInput {
  readonly slideNumber: number;
  readonly layers: readonly EditorCanvasLayerInput[];
}

export interface EditorCanvasSize {
  readonly width: number;
  readonly height: number;
}

export interface EditorCanvasLayerNode {
  readonly id: string;
  readonly slideNumber: number;
  readonly type: EditorCanvasLayerType;
  readonly role: string;
  readonly bounds: EditorCanvasBounds;
  readonly text?: string;
  readonly editable: boolean;
  readonly locked: boolean;
  readonly zIndex: number;
  readonly ariaLabel: string;
  readonly style: EditorCanvasLayerStyle;
}

export interface EditorCanvasLayerStyle {
  readonly left: string;
  readonly top: string;
  readonly width: string;
  readonly height: string;
}

export interface EditorCanvasRenderModel {
  readonly slideNumber: number;
  readonly canvas: EditorCanvasSize;
  readonly layers: readonly EditorCanvasLayerNode[];
}

export interface EditorDeckOpenPerformanceEstimate {
  readonly targetMs: number;
  readonly estimatedMs: number;
  readonly slideCount: number;
  readonly layerCount: number;
  readonly passed: boolean;
}

const DEFAULT_OPEN_TARGET_MS = 5_000;
const SLIDE_MODEL_COST_MS = 24;
const LAYER_NODE_COST_MS = 4;

export function buildEditorCanvasModel(input: {
  readonly canvas: EditorCanvasSize;
  readonly layerModel: EditorCanvasLayerModelInput;
}): EditorCanvasRenderModel {
  return {
    slideNumber: input.layerModel.slideNumber,
    canvas: input.canvas,
    layers: input.layerModel.layers.map((layer, zIndex) =>
      buildLayerNode(layer, input.layerModel.slideNumber, input.canvas, zIndex),
    ),
  };
}

export function buildDeckEditorCanvasModels(input: {
  readonly canvas: EditorCanvasSize;
  readonly layerModels: readonly EditorCanvasLayerModelInput[];
}): readonly EditorCanvasRenderModel[] {
  return input.layerModels.map((layerModel) =>
    buildEditorCanvasModel({ canvas: input.canvas, layerModel }),
  );
}

export function estimateDeckOpenPerformance(
  models: readonly EditorCanvasRenderModel[],
  targetMs = DEFAULT_OPEN_TARGET_MS,
): EditorDeckOpenPerformanceEstimate {
  const slideCount = models.length;
  const layerCount = models.reduce((count, model) => count + model.layers.length, 0);
  const estimatedMs = slideCount * SLIDE_MODEL_COST_MS + layerCount * LAYER_NODE_COST_MS;
  return {
    targetMs,
    estimatedMs,
    slideCount,
    layerCount,
    passed: estimatedMs <= targetMs,
  };
}

function buildLayerNode(
  layer: EditorCanvasLayerInput,
  slideNumber: number,
  canvas: EditorCanvasSize,
  zIndex: number,
): EditorCanvasLayerNode {
  return {
    id: layer.id,
    slideNumber,
    type: layer.type,
    role: layer.role,
    bounds: layer.bounds,
    ...(layer.text === undefined ? {} : { text: layer.text }),
    editable: layer.editable,
    locked: !layer.editable,
    zIndex,
    ariaLabel: `${layer.type} layer ${layer.role}`,
    style: boundsToPercentStyle(layer.bounds, canvas),
  };
}

function boundsToPercentStyle(
  bounds: EditorCanvasBounds,
  canvas: EditorCanvasSize,
): EditorCanvasLayerStyle {
  const clamped = clampBounds(bounds, canvas);
  return {
    left: percent(clamped.x, canvas.width),
    top: percent(clamped.y, canvas.height),
    width: percent(clamped.w, canvas.width),
    height: percent(clamped.h, canvas.height),
  };
}

function clampBounds(bounds: EditorCanvasBounds, canvas: EditorCanvasSize): EditorCanvasBounds {
  const canvasWidth = Math.max(0, canvas.width);
  const canvasHeight = Math.max(0, canvas.height);
  const x = clamp(bounds.x, 0, canvasWidth);
  const y = clamp(bounds.y, 0, canvasHeight);
  const right = clamp(bounds.x + bounds.w, x, canvasWidth);
  const bottom = clamp(bounds.y + bounds.h, y, canvasHeight);
  return { x, y, w: right - x, h: bottom - y };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function percent(value: number, total: number): string {
  if (total <= 0) return "0.00%";
  return `${((value / total) * 100).toFixed(2)}%`;
}
