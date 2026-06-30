import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createEditorFinalizePatch } from "./editor-finalize";

describe("editor finalize patch", () => {
  test("clears editor and export invalidation while recording editor approval", () => {
    const project: DeckProject = {
      id: "project_001",
      name: "Editor Finalize",
      initialPrompt: "Build a deck",
      aspectRatio: "16:9",
      language: "ko",
      slideCount: 5,
      stage: "EDITOR",
      createdAt: 100,
      updatedAt: 200,
      invalidated: { editor: true, export: true, review: true },
      approvalLog: [],
    };

    const patch = createEditorFinalizePatch({
      project,
      layerHash: "sha256:layers",
      finalizedAt: 300,
    });

    expect(patch.stage).toBe("FINAL_REPORTING");
    expect(patch.invalidated).toEqual({ review: true });
    expect(patch.approvalLog[0]).toEqual({
      stage: "editor",
      at: 300,
      hash: "sha256:layers",
      artifactId: "project_001_editor_v1",
      artifactVersion: 1,
      artifactType: "editor",
    });
  });
});
