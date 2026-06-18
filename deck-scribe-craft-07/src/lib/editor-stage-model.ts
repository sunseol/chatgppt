import type { EditableLayerModel } from "./deck-types";
import type { EditorTransformResult } from "./editor-object-transform";

export function applyUpdatedTransform(
  result: EditorTransformResult,
  persistLayers: (layers: EditableLayerModel[]) => void,
) {
  if (result.kind !== "updated") return;
  persistLayers([...result.models]);
}
