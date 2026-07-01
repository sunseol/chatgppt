import { describe, expect, test } from "bun:test";
import { openDesktopProjectFolder } from "./desktop-project-folder";
import type { DeckProject } from "./deck-types";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";

describe("desktop project folder bridge", () => {
  test("writes a local project export and reveals the folder through Tauri", async () => {
    // Given
    const calls: string[] = [];
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async (command, args) => {
          calls.push(command);
          if (command === "deckforge_prepare_project_folder") {
            const request = requestRecord(args);
            expect(request["projectId"]).toBe("project_001");
            expect(request["filename"]).toBe("project_001.deckforge-folder.json");
            expect(String(request["content"]).includes("deckforge_local_project_folder")).toBe(
              true,
            );
            return {
              directoryPath: "/tmp/DeckForge/projects/project_001",
              filePath: "/tmp/DeckForge/projects/project_001/project_001.deckforge-folder.json",
            };
          }
          if (command === "deckforge_reveal_project_folder") {
            expect(args).toEqual({ path: "/tmp/DeckForge/projects/project_001" });
            return null;
          }
          throw new Error(`Unexpected command ${command}`);
        },
      },
    };

    // When
    const result = await openDesktopProjectFolder(projectFixture(), runtime);

    // Then
    expect(result.kind).toBe("opened");
    if (result.kind !== "opened") return;
    expect(calls).toEqual(["deckforge_prepare_project_folder", "deckforge_reveal_project_folder"]);
    expect(result.directoryPath).toBe("/tmp/DeckForge/projects/project_001");
  });

  test("falls back to a downloadable project folder export outside Tauri", async () => {
    // Given
    const runtime: DeckforgeTauriRuntime = {};

    // When
    const result = await openDesktopProjectFolder(projectFixture(), runtime);

    // Then
    expect(result.kind).toBe("download_required");
    if (result.kind !== "download_required") return;
    expect(result.file.filename).toBe("project_001.deckforge-folder.json");
  });
});

function projectFixture(): DeckProject {
  return {
    id: "project_001",
    name: "Local Folder Fixture",
    initialPrompt: "Open the project folder.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "PROJECT_CREATED",
    createdAt: 1,
    updatedAt: 2,
    invalidated: {},
    approvalLog: [],
  };
}

function requestRecord(
  args: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> {
  const request = args?.["request"];
  if (typeof request !== "object" || request === null || Array.isArray(request)) {
    throw new Error("Expected project folder request.");
  }
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(request)) record[key] = value;
  return record;
}
