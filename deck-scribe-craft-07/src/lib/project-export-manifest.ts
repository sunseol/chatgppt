import type { DeckProject } from "./deck-types";
import type { ProjectExportPptxResult } from "./pptx-project-export";
import type { ProjectExportHybridSvgFile, ProjectExportSvgFile } from "./svg-project-export";

type ExportSlideFileRef = {
  readonly slideNumber: number;
  readonly path: string;
  readonly hash: string;
};

type ExportFileRef = {
  readonly path: string;
  readonly hash: string;
};

type ExportPptxFileRef = ExportFileRef & {
  readonly backgroundImageCount: number;
};

export type ProjectExportManifest = {
  readonly type: "deckforge_project_export";
  readonly projectId: string;
  readonly createdAt: number;
  readonly exportBasis: "approved_final_layout";
  readonly pngFiles: readonly ExportSlideFileRef[];
  readonly svgFiles: readonly Pick<ProjectExportSvgFile, "slideNumber" | "path" | "hash">[];
  readonly hybridSvgFiles: readonly Pick<
    ProjectExportHybridSvgFile,
    "slideNumber" | "path" | "hash"
  >[];
  readonly pptxFile?: ExportPptxFileRef;
  readonly projectFile: ExportFileRef;
};

export function buildProjectExportManifest(input: {
  readonly project: DeckProject;
  readonly createdAt: number;
  readonly pngFiles: readonly ExportSlideFileRef[];
  readonly svgFiles: readonly ProjectExportSvgFile[];
  readonly hybridSvgFiles: readonly ProjectExportHybridSvgFile[];
  readonly pptxExport: ProjectExportPptxResult;
  readonly projectFile: ExportFileRef;
}): ProjectExportManifest {
  return {
    type: "deckforge_project_export",
    projectId: input.project.id,
    createdAt: input.createdAt,
    exportBasis: "approved_final_layout",
    pngFiles: input.pngFiles.map(toSlideFileRef),
    svgFiles: input.svgFiles.map(toSlideFileRef),
    hybridSvgFiles: input.hybridSvgFiles.map(toSlideFileRef),
    ...(input.pptxExport.kind === "ready"
      ? {
          pptxFile: {
            path: input.pptxExport.file.path,
            hash: input.pptxExport.file.hash,
            backgroundImageCount: input.pptxExport.file.backgroundImageCount,
          },
        }
      : {}),
    projectFile: { path: input.projectFile.path, hash: input.projectFile.hash },
  };
}

function toSlideFileRef(file: ExportSlideFileRef): ExportSlideFileRef {
  return { slideNumber: file.slideNumber, path: file.path, hash: file.hash };
}
