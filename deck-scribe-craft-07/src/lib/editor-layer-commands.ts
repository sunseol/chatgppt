import type { EditableLayerModel } from "./deck-types";

export type EditorLayerCommand =
  | {
      readonly kind: "duplicate";
      readonly slideNumber: number;
      readonly layerId: string;
      readonly newLayerId: string;
    }
  | {
      readonly kind: "delete";
      readonly slideNumber: number;
      readonly layerId: string;
    }
  | {
      readonly kind: "group";
      readonly slideNumber: number;
      readonly layerIds: readonly string[];
      readonly groupId: string;
    }
  | {
      readonly kind: "ungroup";
      readonly slideNumber: number;
      readonly groupId: string;
    };

export type EditorCommandRejectReason = "not_found" | "locked" | "duplicate_id" | "empty_group";

export type LayerCommandApplyResult =
  | {
      readonly kind: "updated";
      readonly models: readonly EditableLayerModel[];
      readonly changedLayerIds: readonly string[];
    }
  | {
      readonly kind: "rejected";
      readonly reason: EditorCommandRejectReason;
    };

export function applyLayerCommand(
  models: readonly EditableLayerModel[],
  command: EditorLayerCommand,
): LayerCommandApplyResult {
  switch (command.kind) {
    case "duplicate":
      return duplicateLayer(models, command);
    case "delete":
      return deleteLayer(models, command);
    case "group":
      return groupLayers(models, command);
    case "ungroup":
      return ungroupLayers(models, command);
  }
}

function duplicateLayer(
  models: readonly EditableLayerModel[],
  command: Extract<EditorLayerCommand, { readonly kind: "duplicate" }>,
): LayerCommandApplyResult {
  const target = findLayer(models, command.slideNumber, command.layerId);
  if (target === undefined) return { kind: "rejected", reason: "not_found" };
  if (!target.editable) return { kind: "rejected", reason: "locked" };
  if (findLayer(models, command.slideNumber, command.newLayerId) !== undefined) {
    return { kind: "rejected", reason: "duplicate_id" };
  }

  const duplicate = duplicateFromLayer(target, command.newLayerId);
  return {
    kind: "updated",
    changedLayerIds: [command.newLayerId],
    models: models.map((model) =>
      model.slideNumber === command.slideNumber
        ? { ...model, layers: [...model.layers, duplicate] }
        : model,
    ),
  };
}

function deleteLayer(
  models: readonly EditableLayerModel[],
  command: Extract<EditorLayerCommand, { readonly kind: "delete" }>,
): LayerCommandApplyResult {
  const target = findLayer(models, command.slideNumber, command.layerId);
  if (target === undefined) return { kind: "rejected", reason: "not_found" };
  if (!target.editable) return { kind: "rejected", reason: "locked" };

  return {
    kind: "updated",
    changedLayerIds: [command.layerId],
    models: models.map((model) =>
      model.slideNumber === command.slideNumber
        ? { ...model, layers: model.layers.filter((layer) => layer.id !== command.layerId) }
        : model,
    ),
  };
}

function groupLayers(
  models: readonly EditableLayerModel[],
  command: Extract<EditorLayerCommand, { readonly kind: "group" }>,
): LayerCommandApplyResult {
  if (command.layerIds.length === 0) return { kind: "rejected", reason: "empty_group" };
  const targets = command.layerIds.map((layerId) =>
    findLayer(models, command.slideNumber, layerId),
  );
  if (targets.some((layer) => layer === undefined)) {
    return { kind: "rejected", reason: "not_found" };
  }
  if (targets.some((layer) => layer?.editable === false)) {
    return { kind: "rejected", reason: "locked" };
  }

  return {
    kind: "updated",
    changedLayerIds: command.layerIds,
    models: models.map((model) =>
      model.slideNumber === command.slideNumber
        ? {
            ...model,
            layers: model.layers.map((layer) =>
              command.layerIds.includes(layer.id) ? { ...layer, groupId: command.groupId } : layer,
            ),
          }
        : model,
    ),
  };
}

function ungroupLayers(
  models: readonly EditableLayerModel[],
  command: Extract<EditorLayerCommand, { readonly kind: "ungroup" }>,
): LayerCommandApplyResult {
  const groupedIds = models.flatMap((model) =>
    model.slideNumber === command.slideNumber
      ? model.layers.flatMap((layer) => (layer.groupId === command.groupId ? [layer.id] : []))
      : [],
  );
  if (groupedIds.length === 0) return { kind: "rejected", reason: "not_found" };

  return {
    kind: "updated",
    changedLayerIds: groupedIds,
    models: models.map((model) =>
      model.slideNumber === command.slideNumber
        ? {
            ...model,
            layers: model.layers.map((layer) =>
              layer.groupId === command.groupId ? withoutGroupId(layer) : layer,
            ),
          }
        : model,
    ),
  };
}

function duplicateFromLayer(
  layer: EditableLayerModel["layers"][number],
  newLayerId: string,
): EditableLayerModel["layers"][number] {
  const copy = withoutGroupId(layer);
  return {
    ...copy,
    id: newLayerId,
    bounds: {
      ...copy.bounds,
      x: copy.bounds.x + 24,
      y: copy.bounds.y + 24,
    },
  };
}

function withoutGroupId(
  layer: EditableLayerModel["layers"][number],
): EditableLayerModel["layers"][number] {
  const { groupId: _groupId, ...rest } = layer;
  return rest;
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
