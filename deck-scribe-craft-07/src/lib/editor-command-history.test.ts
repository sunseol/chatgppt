import { describe, expect, test } from "bun:test";
import type { EditableLayerModel } from "./deck-types";
import {
  applyEditorCommand,
  createEditorCommandHistory,
  redoEditorCommand,
  undoEditorCommand,
} from "./editor-command-history";

describe("editor command history", () => {
  test("preserves duplicate edits across undo and redo", () => {
    // Given
    const history = createEditorCommandHistory(layerModelsFixture());

    // When
    const duplicated = applyEditorCommand(history, {
      kind: "duplicate",
      slideNumber: 1,
      layerId: "title_1",
      newLayerId: "title_1_copy",
    });
    const undone =
      duplicated.kind === "updated" ? undoEditorCommand(duplicated.history) : duplicated;
    const redone = undone.kind === "updated" ? redoEditorCommand(undone.history) : undone;

    // Then
    expect(duplicated.kind).toBe("updated");
    expect(layerIds(duplicated.history.present)).toEqual([
      "bg_1",
      "title_1",
      "chart_1",
      "title_1_copy",
    ]);
    expect(undone.kind).toBe("updated");
    expect(layerIds(undone.history.present)).toEqual(["bg_1", "title_1", "chart_1"]);
    expect(redone.kind).toBe("updated");
    expect(layerIds(redone.history.present)).toEqual([
      "bg_1",
      "title_1",
      "chart_1",
      "title_1_copy",
    ]);
  });

  test("applies delete group and ungroup without mutating earlier history", () => {
    // Given
    const history = createEditorCommandHistory(layerModelsFixture());

    // When
    const deleted = applyEditorCommand(history, {
      kind: "delete",
      slideNumber: 1,
      layerId: "chart_1",
    });
    const grouped =
      deleted.kind === "updated"
        ? applyEditorCommand(deleted.history, {
            kind: "group",
            slideNumber: 1,
            layerIds: ["title_1"],
            groupId: "group_title",
          })
        : deleted;
    const ungrouped =
      grouped.kind === "updated"
        ? applyEditorCommand(grouped.history, {
            kind: "ungroup",
            slideNumber: 1,
            groupId: "group_title",
          })
        : grouped;

    // Then
    expect(layerIds(history.present)).toEqual(["bg_1", "title_1", "chart_1"]);
    expect(deleted.kind).toBe("updated");
    expect(layerIds(deleted.history.present)).toEqual(["bg_1", "title_1"]);
    expect(grouped.kind).toBe("updated");
    expect(groupIds(grouped.history.present)).toEqual(["group_title"]);
    expect(ungrouped.kind).toBe("updated");
    expect(groupIds(ungrouped.history.present)).toEqual([]);
  });

  test("rejects locked layer deletion without corrupting current work", () => {
    // Given
    const history = createEditorCommandHistory(layerModelsFixture());

    // When
    const result = applyEditorCommand(history, {
      kind: "delete",
      slideNumber: 1,
      layerId: "bg_1",
    });

    // Then
    expect(result).toEqual({
      kind: "rejected",
      reason: "locked",
      history,
    });
    expect(layerIds(history.present)).toEqual(["bg_1", "title_1", "chart_1"]);
  });
});

function layerModelsFixture(): readonly EditableLayerModel[] {
  return [
    {
      slideNumber: 1,
      layers: [
        {
          id: "bg_1",
          type: "shape",
          role: "background",
          bounds: { x: 0, y: 0, w: 1600, h: 900 },
          editable: false,
        },
        {
          id: "title_1",
          type: "text",
          role: "title",
          text: "기존 제목",
          bounds: { x: 110, y: 84, w: 900, h: 120 },
          editable: true,
        },
        {
          id: "chart_1",
          type: "chart",
          role: "chart",
          bounds: { x: 1000, y: 360, w: 420, h: 320 },
          editable: true,
        },
      ],
    },
  ];
}

function layerIds(models: readonly EditableLayerModel[]): readonly string[] {
  return models.flatMap((model) => model.layers.map((layer) => layer.id));
}

function groupIds(models: readonly EditableLayerModel[]): readonly string[] {
  return models.flatMap((model) =>
    model.layers.flatMap((layer) => (layer.groupId === undefined ? [] : [layer.groupId])),
  );
}
