import { z } from "zod";
import {
  getTauriRuntime,
  type CodexAppServerSmokeError,
  type DeckforgeTauriRuntime,
} from "./desktop-app-server-bridge";
import type { DeckProject } from "./deck-types";
import {
  buildLocalProjectFolderExport,
  type LocalProjectFolderExportFile,
} from "./local-data-control";

const ProjectFolderEvidenceSchema = z.object({
  directoryPath: z.string().min(1),
  filePath: z.string().min(1),
});

const ProjectFolderCommandErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type DesktopProjectFolderEvidence = Readonly<z.infer<typeof ProjectFolderEvidenceSchema>>;

export type DesktopProjectFolderResult =
  | {
      readonly kind: "opened";
      readonly directoryPath: string;
      readonly filePath: string;
    }
  | {
      readonly kind: "download_required";
      readonly file: LocalProjectFolderExportFile;
    }
  | {
      readonly kind: "failed";
      readonly error: CodexAppServerSmokeError;
    };

export async function openDesktopProjectFolder(
  project: DeckProject,
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
): Promise<DesktopProjectFolderResult> {
  const file = buildLocalProjectFolderExport(project);
  const invoke = runtime?.core?.invoke;
  if (!invoke) return { kind: "download_required", file };

  try {
    const evidence = ProjectFolderEvidenceSchema.parse(
      await invoke("deckforge_prepare_project_folder", {
        request: {
          projectId: project.id,
          filename: file.filename,
          content: file.content,
        },
      }),
    );
    await invoke("deckforge_reveal_project_folder", { path: evidence.directoryPath });
    return {
      kind: "opened",
      directoryPath: evidence.directoryPath,
      filePath: evidence.filePath,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        kind: "failed",
        error: { code: "invalid_project_folder_evidence", message: error.message },
      };
    }
    const parsed = ProjectFolderCommandErrorSchema.safeParse(error);
    if (parsed.success) return { kind: "failed", error: parsed.data };
    if (error instanceof Error) {
      return { kind: "failed", error: { code: "project_folder_failed", message: error.message } };
    }
    throw error;
  }
}
