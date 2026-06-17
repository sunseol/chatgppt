import type { EditableLayerModel } from "./deck-types";
import { hashContent } from "./artifacts";

export type EditorTextEditRejectReason = "not_found" | "locked" | "not_text";

export interface EditorTextEditInput {
  readonly slideNumber: number;
  readonly layerId: string;
  readonly text: string;
}

export interface EditorLayersExportPayload {
  readonly type: "editor_layers_export";
  readonly layers: readonly EditableLayerModel[];
  readonly layerCount: number;
  readonly textLayerCount: number;
  readonly hash: string;
}

export type EditorTextEditResult =
  | {
      readonly kind: "updated";
      readonly models: readonly EditableLayerModel[];
      readonly updatedLayer: EditableLayerModel["layers"][number];
      readonly exportPayload: EditorLayersExportPayload;
    }
  | {
      readonly kind: "rejected";
      readonly reason: EditorTextEditRejectReason;
    };

export function applyDeckLayerTextEdit(
  models: readonly EditableLayerModel[],
  input: EditorTextEditInput,
): EditorTextEditResult {
  const target = findLayer(models, input);
  if (!target) return { kind: "rejected", reason: "not_found" };
  if (!target.editable) return { kind: "rejected", reason: "locked" };
  if (target.type !== "text") return { kind: "rejected", reason: "not_text" };

  const next = models.map((model): EditableLayerModel => {
    if (model.slideNumber !== input.slideNumber) return model;
    return {
      ...model,
      layers: model.layers.map((layer) =>
        layer.id === input.layerId ? { ...layer, text: input.text } : layer,
      ),
    };
  });
  const updatedLayer = findLayer(next, input);
  if (!updatedLayer) return { kind: "rejected", reason: "not_found" };
  return {
    kind: "updated",
    models: next,
    updatedLayer,
    exportPayload: serializeEditorLayersForExport(next),
  };
}

export function serializeEditorLayersForExport(
  models: readonly EditableLayerModel[],
): EditorLayersExportPayload {
  const layers = models.map(
    (model): EditableLayerModel => ({
      ...model,
      layers: model.layers.map((layer) => ({ ...layer })),
    }),
  );
  const layerCount = layers.reduce((count, model) => count + model.layers.length, 0);
  const textLayerCount = layers.reduce(
    (count, model) => count + model.layers.filter((layer) => layer.type === "text").length,
    0,
  );
  return {
    type: "editor_layers_export",
    layers,
    layerCount,
    textLayerCount,
    hash: hashContent(JSON.stringify(layers)),
  };
}

function findLayer(
  models: readonly EditableLayerModel[],
  input: EditorTextEditInput,
): EditableLayerModel["layers"][number] | undefined {
  return models
    .find((model) => model.slideNumber === input.slideNumber)
    ?.layers.find((layer) => layer.id === input.layerId);
}
