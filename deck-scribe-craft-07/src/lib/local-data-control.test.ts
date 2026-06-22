import { describe, expect, test } from "bun:test";
import type { BrowserImageArtifactWrite } from "./browser-image-artifact-store";
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

  test("includes project-scoped browser artifact writes in the folder export", () => {
    const artifactWrites: readonly BrowserImageArtifactWrite[] = [
      {
        path: "projects/project_001/usage/project_001/job_generate_1/image-billing-confirmation.json",
        content: {
          kind: "text",
          value: '{"label":"Codex image usage confirmed","secret":"sk-live-secret123"}',
        },
      },
      {
        path: "projects/project_001/slides/images/slide_001.v1.png",
        content: { kind: "base64", value: "AQID" },
      },
      {
        path: "projects/project_002/usage/project_002/job_generate_1/image-billing-confirmation.json",
        content: { kind: "text", value: '{"label":"Other project"}' },
      },
    ];

    const file = buildLocalProjectFolderExport(projectFixture(), { artifactWrites });

    expect(file.content.includes("projectArtifactWrites")).toBe(true);
    expect(
      file.content.includes(
        "projects/project_001/usage/project_001/job_generate_1/image-billing-confirmation.json",
      ),
    ).toBe(true);
    expect(file.content.includes("projects/project_001/slides/images/slide_001.v1.png")).toBe(true);
    expect(file.content.includes("projects/project_002")).toBe(false);
    expect(file.content.includes("sk-live-secret123")).toBe(false);
    expect(file.content.includes("[redacted]")).toBe(true);
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
