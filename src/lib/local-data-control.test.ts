import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { buildLocalProjectFolderExport, describeLocalProjectStorage } from "./local-data-control";

describe("local-first project data controls", () => {
  test("describes browser local storage and virtual project folder location", () => {
    const storage = describeLocalProjectStorage(projectFixture());

    expect(storage.provider).toBe("browser_local_storage");
    expect(storage.storageKey).toBe("deckforge.projects.v1");
    expect(storage.virtualFolderPath).toBe("projects/project_001");
    expect(storage.cloudSync).toBe("not_available");
    expect(storage.exportFilename).toBe("project_001.deckforge-folder.json");
  });

  test("builds a redacted local-only project folder export", () => {
    const file = buildLocalProjectFolderExport(projectFixture());

    expect(file.filename).toBe("project_001.deckforge-folder.json");
    expect(file.mime).toBe("application/json");
    expect(file.content.includes("deckforge_local_project_folder")).toBe(true);
    expect(file.content.includes("browser_local_storage")).toBe(true);
    expect(file.content.includes("projects/project_001")).toBe(true);
    expect(file.content.includes("sk-live-secret123")).toBe(false);
    expect(file.content.includes("[redacted]")).toBe(true);
    expect(file.hash.startsWith("sha256:")).toBe(true);
  });
});

function projectFixture(): DeckProject {
  return {
    id: "project_001",
    name: "Local Fixture",
    initialPrompt: "OPENAI_API_KEY=sk-live-secret123",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "PROJECT_CREATED",
    createdAt: 1,
    updatedAt: 2,
    invalidated: {},
    approvalLog: [],
  };
}
