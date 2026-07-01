import { getProjectFolderSchema, hashContent } from "./artifacts";
import type { DeckProject } from "./deck-types";
import { redactSensitiveText } from "./redaction";

export const LOCAL_PROJECT_STORAGE_KEY = "deckforge.projects.v1";

export type LocalProjectStorageDescriptor = {
  readonly projectId: string;
  readonly provider: "browser_local_storage";
  readonly storageKey: typeof LOCAL_PROJECT_STORAGE_KEY;
  readonly virtualFolderPath: string;
  readonly cloudSync: "not_available";
  readonly exportFilename: string;
};

export type LocalProjectFolderExportFile = {
  readonly filename: string;
  readonly mime: "application/json";
  readonly content: string;
  readonly hash: string;
};

export type LocalProjectArchiveExportFile = LocalProjectFolderExportFile;

export function describeLocalProjectStorage(project: DeckProject): LocalProjectStorageDescriptor {
  return {
    projectId: project.id,
    provider: "browser_local_storage",
    storageKey: LOCAL_PROJECT_STORAGE_KEY,
    virtualFolderPath: `projects/${project.id}`,
    cloudSync: "not_available",
    exportFilename: `${project.id}.deckforge-folder.json`,
  };
}

export function buildLocalProjectArchiveExport(
  projects: readonly DeckProject[],
): LocalProjectArchiveExportFile {
  const content = redactSensitiveText(
    JSON.stringify(
      {
        type: "deckforge_local_project_archive",
        storageKey: LOCAL_PROJECT_STORAGE_KEY,
        exportedAt: new Date(0).toISOString(),
        projects,
      },
      null,
      2,
    ),
  );
  return {
    filename: "deckforge-projects.deckforge-archive.json",
    mime: "application/json",
    content,
    hash: hashContent(content),
  };
}

export function buildLocalProjectFolderExport(project: DeckProject): LocalProjectFolderExportFile {
  const storage = describeLocalProjectStorage(project);
  const content = redactSensitiveText(
    JSON.stringify(
      {
        type: "deckforge_local_project_folder",
        storage,
        folders: getProjectFolderSchema(project.id),
        project,
      },
      null,
      2,
    ),
  );
  return {
    filename: storage.exportFilename,
    mime: "application/json",
    content,
    hash: hashContent(content),
  };
}
