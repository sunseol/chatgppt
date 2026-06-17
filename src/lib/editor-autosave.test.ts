import { describe, expect, test } from "bun:test";
import type { EditableLayerModel } from "./deck-types";
import {
  createEditorAutosaveSnapshot,
  parseEditorAutosaveSnapshots,
  recoverLatestEditorAutosave,
  serializeEditorAutosaveSnapshots,
  shouldAutosaveEditor,
} from "./editor-autosave";

describe("editor autosave recovery", () => {
  test("creates deterministic snapshots with edited Korean layer text", () => {
    const snapshot = createEditorAutosaveSnapshot({
      projectId: "project_001",
      layers: layerModelsFixture("새 제목입니다"),
      reason: "edit",
      now: () => 123,
    });

    expect(snapshot.id).toBe("autosave_project_001_123");
    expect(snapshot.projectId).toBe("project_001");
    expect(snapshot.path).toBe(
      "projects/project_001/autosave/editor/autosave_project_001_123.json",
    );
    expect(snapshot.hash.startsWith("sha256:")).toBe(true);
    expect(snapshot.layers[0]?.layers[1]?.text).toBe("새 제목입니다");
  });

  test("autosaves immediately for dirty edits and every ten seconds otherwise", () => {
    expect(
      shouldAutosaveEditor({ dirty: true, lastSavedAt: 100, now: 101, intervalMs: 10_000 }),
    ).toBe(true);
    expect(
      shouldAutosaveEditor({ dirty: false, lastSavedAt: 100, now: 10_099, intervalMs: 10_000 }),
    ).toBe(false);
    expect(
      shouldAutosaveEditor({ dirty: false, lastSavedAt: 100, now: 10_100, intervalMs: 10_000 }),
    ).toBe(true);
  });

  test("recovers the latest snapshot for a project", () => {
    const oldSnapshot = createEditorAutosaveSnapshot({
      projectId: "project_001",
      layers: layerModelsFixture("이전 제목"),
      reason: "interval",
      now: () => 100,
    });
    const latestSnapshot = createEditorAutosaveSnapshot({
      projectId: "project_001",
      layers: layerModelsFixture("복구된 제목"),
      reason: "crash_recovery",
      now: () => 200,
    });
    const recovery = recoverLatestEditorAutosave({
      projectId: "project_001",
      snapshots: [oldSnapshot, latestSnapshot],
    });

    expect(recovery.kind).toBe("recovered");
    if (recovery.kind !== "recovered") return;
    expect(recovery.snapshot.id).toBe("autosave_project_001_200");
    expect(recovery.layers[0]?.layers[1]?.text).toBe("복구된 제목");
  });

  test("round-trips restart recovery snapshots through storage text", () => {
    const snapshot = createEditorAutosaveSnapshot({
      projectId: "project_001",
      layers: layerModelsFixture("재시작 후 복구"),
      reason: "edit",
      now: () => 300,
    });

    const restored = parseEditorAutosaveSnapshots(serializeEditorAutosaveSnapshots([snapshot]));

    expect(restored[0]?.id).toBe("autosave_project_001_300");
    expect(restored[0]?.layers[0]?.layers[1]?.text).toBe("재시작 후 복구");
    expect(parseEditorAutosaveSnapshots("{not json")).toEqual([]);
  });
});

function layerModelsFixture(title: string): readonly EditableLayerModel[] {
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
          text: title,
          bounds: { x: 96, y: 72, w: 900, h: 120 },
          editable: true,
        },
      ],
    },
  ];
}
