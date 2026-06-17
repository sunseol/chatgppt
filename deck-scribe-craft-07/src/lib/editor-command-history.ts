import type { EditableLayerModel } from "./deck-types";
import {
  applyLayerCommand,
  type EditorCommandRejectReason,
  type EditorLayerCommand,
} from "./editor-layer-commands";

export type { EditorCommandRejectReason, EditorLayerCommand } from "./editor-layer-commands";

export type EditorCommandHistory = {
  readonly present: readonly EditableLayerModel[];
  readonly undoStack: readonly (readonly EditableLayerModel[])[];
  readonly redoStack: readonly (readonly EditableLayerModel[])[];
};

export type EditorCommandResult =
  | {
      readonly kind: "updated";
      readonly history: EditorCommandHistory;
      readonly changedLayerIds: readonly string[];
    }
  | {
      readonly kind: "rejected";
      readonly reason: EditorCommandRejectReason;
      readonly history: EditorCommandHistory;
    };

export function createEditorCommandHistory(
  initial: readonly EditableLayerModel[],
): EditorCommandHistory {
  return {
    present: cloneModels(initial),
    undoStack: [],
    redoStack: [],
  };
}

export function applyEditorCommand(
  history: EditorCommandHistory,
  command: EditorLayerCommand,
): EditorCommandResult {
  const applied = applyLayerCommand(history.present, command);
  if (applied.kind === "rejected") {
    return { kind: "rejected", reason: applied.reason, history };
  }

  return {
    kind: "updated",
    changedLayerIds: applied.changedLayerIds,
    history: {
      present: applied.models,
      undoStack: [...history.undoStack, history.present],
      redoStack: [],
    },
  };
}

export function undoEditorCommand(history: EditorCommandHistory): EditorCommandResult {
  const previous = last(history.undoStack);
  if (previous === undefined) return { kind: "rejected", reason: "not_found", history };

  return {
    kind: "updated",
    changedLayerIds: [],
    history: {
      present: previous,
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [history.present, ...history.redoStack],
    },
  };
}

export function redoEditorCommand(history: EditorCommandHistory): EditorCommandResult {
  const next = history.redoStack[0];
  if (next === undefined) return { kind: "rejected", reason: "not_found", history };

  return {
    kind: "updated",
    changedLayerIds: [],
    history: {
      present: next,
      undoStack: [...history.undoStack, history.present],
      redoStack: history.redoStack.slice(1),
    },
  };
}

function cloneModels(models: readonly EditableLayerModel[]): readonly EditableLayerModel[] {
  return models.map((model) => ({
    ...model,
    layers: model.layers.map((layer) => ({ ...layer, bounds: { ...layer.bounds } })),
  }));
}

function last<T>(values: readonly T[]): T | undefined {
  return values[values.length - 1];
}
