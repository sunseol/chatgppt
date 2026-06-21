import { getProjectFolderSchema, hashContent } from "./artifacts";
import type { BrowserImageArtifactWrite } from "./browser-image-artifact-store";
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

export type LocalProjectFolderExportOptions = {
  readonly artifactWrites?: readonly BrowserImageArtifactWrite[];
};

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

export function buildLocalProjectFolderExport(
  project: DeckProject,
  options: LocalProjectFolderExportOptions = {},
): LocalProjectFolderExportFile {
  const storage = describeLocalProjectStorage(project);
  const content = redactSensitiveText(
    JSON.stringify(
      {
        type: "deckforge_local_project_folder",
        storage,
        folders: getProjectFolderSchema(project.id),
        project,
        projectArtifactWrites: projectArtifactWrites(project.id, options.artifactWrites ?? []),
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

function projectArtifactWrites(
  projectId: string,
  artifactWrites: readonly BrowserImageArtifactWrite[],
): readonly BrowserImageArtifactWrite[] {
  const prefix = `projects/${projectId}/`;
  return artifactWrites
    .filter((write) => write.path.startsWith(prefix))
    .map((write) => ({
      path: write.path,
      content: redactedArtifactContent(write.content),
    }));
}

function redactedArtifactContent(
  content: BrowserImageArtifactWrite["content"],
): BrowserImageArtifactWrite["content"] {
  switch (content.kind) {
    case "base64":
      return content;
    case "text":
      return { kind: "text", value: redactSensitiveText(content.value) };
    default:
      return assertNever(content);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled local project artifact content: ${String(value)}`);
}
