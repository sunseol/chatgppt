import { createArtifactRecord, hashContent, type ArtifactRecord } from "./artifacts";
import type {
  ApprovalLogEntry,
  DeckProject,
  EditableLayerModel,
  LayoutPrototype,
  ProjectExportSummary,
} from "./deck-types";
import { buildProjectExportManifest, type ProjectExportManifest } from "./project-export-manifest";
import { buildPptxCompatibilityExport, type ProjectExportPptxResult } from "./pptx-project-export";
import { redactSensitiveText } from "./redaction";
import {
  buildHybridSvgFiles,
  buildNativeSvgFiles,
  type ProjectExportHybridSvgFile,
  type ProjectExportSvgFile,
} from "./svg-project-export";

export type ProjectExportIssueCode =
  | "missing_design"
  | "missing_layout"
  | "missing_layers"
  | "missing_layout_png";

export type ProjectExportIssue = {
  readonly code: ProjectExportIssueCode;
  readonly slideNumber?: number;
  readonly message: string;
};

export type ProjectExportFile = {
  readonly filename: string;
  readonly path: string;
  readonly mime: string;
  readonly content: string;
  readonly hash: string;
};

export type ProjectExportPngFile = {
  readonly slideNumber: number;
  readonly filename: string;
  readonly path: string;
  readonly dataUrl: string;
  readonly hash: string;
  readonly source: "approved_layout_png" | "live_generation_background";
};

export type ProjectExportSecretScan = {
  readonly passed: boolean;
  readonly findings: readonly string[];
};

export type ProjectExportPackage = {
  readonly artifact: ArtifactRecord;
  readonly manifest: ProjectExportManifest;
  readonly pngFiles: readonly ProjectExportPngFile[];
  readonly svgFiles: readonly ProjectExportSvgFile[];
  readonly hybridSvgFiles: readonly ProjectExportHybridSvgFile[];
  readonly pptxExport: ProjectExportPptxResult;
  readonly projectFile: ProjectExportFile;
  readonly secretScan: ProjectExportSecretScan;
  readonly summary: ProjectExportSummary;
};

export type ProjectExportBuildResult =
  | { readonly kind: "ready"; readonly package: ProjectExportPackage }
  | { readonly kind: "blocked"; readonly issues: readonly ProjectExportIssue[] };

export function buildProjectExportPackage(
  project: DeckProject,
  options: { readonly now?: () => number; readonly version?: number } = {},
): ProjectExportBuildResult {
  const layers = project.layers ?? [];
  const issues = collectExportIssues(project, layers);
  if (issues.length > 0) return { kind: "blocked", issues };
  if (!project.layout) return { kind: "blocked", issues };

  const createdAt = options.now?.() ?? Date.now();
  const version = options.version ?? nextExportVersion(project);
  const pngFiles = buildPngFiles({ project, layout: project.layout, layers });
  const svgFiles = buildNativeSvgFiles({ project, layers });
  const hybridSvgFiles = buildHybridSvgFiles({ project, layers });
  const pptxExport = buildPptxCompatibilityExport({ project, layers });
  const projectFile = buildProjectFile(project);
  const manifest = buildProjectExportManifest({
    project,
    createdAt,
    pngFiles,
    svgFiles,
    hybridSvgFiles,
    pptxExport,
    projectFile,
  });
  const artifact = createArtifactRecord({
    projectId: project.id,
    type: "export",
    version,
    content: JSON.stringify(manifest),
    createdAt,
  });
  return {
    kind: "ready",
    package: {
      artifact,
      manifest,
      pngFiles,
      svgFiles,
      hybridSvgFiles,
      pptxExport,
      projectFile,
      secretScan: scanProjectExportSecrets(projectFile.content),
      summary: {
        artifactId: artifact.id,
        artifactHash: artifact.hash,
        artifactPath: artifact.path,
        createdAt,
        pngCount: pngFiles.length,
        svgCount: svgFiles.length,
        hybridSvgCount: hybridSvgFiles.length,
        ...(pptxExport.kind === "ready"
          ? {
              pptxFilePath: pptxExport.file.path,
              pptxBackgroundImageCount: pptxExport.file.backgroundImageCount,
            }
          : {}),
        projectFilePath: projectFile.path,
      },
    },
  };
}

export function createProjectExportPatch(input: {
  readonly project: DeckProject;
  readonly exportPackage: ProjectExportPackage;
}): Pick<DeckProject, "stage" | "approvalLog" | "exportPackage"> {
  const entry: ApprovalLogEntry = {
    stage: "export",
    at: input.exportPackage.summary.createdAt,
    hash: input.exportPackage.artifact.hash,
    artifactId: input.exportPackage.artifact.id,
    artifactVersion: input.exportPackage.artifact.version,
    artifactType: input.exportPackage.artifact.type,
  };
  return {
    stage: "EXPORT_READY",
    exportPackage: input.exportPackage.summary,
    approvalLog: [...input.project.approvalLog, entry],
  };
}

export function scanProjectExportSecrets(content: string): ProjectExportSecretScan {
  const redacted = redactSensitiveText(content);
  return redacted === content
    ? { passed: true, findings: [] }
    : { passed: false, findings: ["secret_like_value"] };
}

function collectExportIssues(
  project: DeckProject,
  layers: readonly EditableLayerModel[],
): readonly ProjectExportIssue[] {
  const layout = project.layout;
  if (!project.design) return [{ code: "missing_design", message: "Approved design is required." }];
  if (!layout) return [{ code: "missing_layout", message: "Approved layout is required." }];
  if (layers.length === 0) {
    return [{ code: "missing_layers", message: "Editable layers are required." }];
  }
  return layers
    .filter(
      (model) =>
        !layout.slides.find((slide) => slide.number === model.slideNumber)?.layoutPngDataUrl,
    )
    .map((model) => ({
      code: "missing_layout_png",
      slideNumber: model.slideNumber,
      message: `Slide ${model.slideNumber} is missing its approved layout PNG.`,
    }));
}

function buildPngFiles(input: {
  readonly project: DeckProject;
  readonly layout: LayoutPrototype;
  readonly layers: readonly EditableLayerModel[];
}): readonly ProjectExportPngFile[] {
  const liveBackgrounds = liveBackgroundsBySlide(input.project);
  return input.layers.flatMap((model) => {
    const liveBackground = liveBackgrounds.get(model.slideNumber);
    const dataUrl = input.layout.slides.find(
      (slide) => slide.number === model.slideNumber,
    )?.layoutPngDataUrl;
    const pngDataUrl = liveBackground?.dataUrl ?? dataUrl;
    if (!pngDataUrl) return [];
    const padded = String(model.slideNumber).padStart(2, "0");
    return [
      {
        slideNumber: model.slideNumber,
        filename: `slide_${padded}.png`,
        path: `projects/${input.project.id}/exports/png/slide_${padded}.png`,
        dataUrl: pngDataUrl,
        hash: liveBackground?.hash ?? hashContent(pngDataUrl),
        source: liveBackground ? "live_generation_background" : "approved_layout_png",
      },
    ];
  });
}

function liveBackgroundsBySlide(
  project: DeckProject,
): ReadonlyMap<number, { readonly dataUrl: string; readonly hash: string }> {
  const artifacts = new Map(
    (project.liveSlideGeneration?.artifacts ?? []).map((artifact) => [
      artifact.slideNumber,
      artifact,
    ]),
  );
  const backgrounds = new Map<number, { readonly dataUrl: string; readonly hash: string }>();
  for (const stored of project.liveSlideGeneration?.storedArtifacts ?? []) {
    const artifact = artifacts.get(stored.metadata.slideNumber);
    if (artifact) {
      backgrounds.set(stored.metadata.slideNumber, {
        dataUrl: artifact.imageDataUrl,
        hash: stored.binary.hash,
      });
    }
  }
  return backgrounds;
}

function buildProjectFile(project: DeckProject): ProjectExportFile {
  const content = redactSensitiveText(
    JSON.stringify(
      {
        ...project,
        approvalLog: project.approvalLog.filter((entry) => entry.stage !== "export"),
        exportPackage: undefined,
      },
      null,
      2,
    ),
  );
  return {
    filename: `${project.id}.deckforge.json`,
    path: `projects/${project.id}/exports/${project.id}.deckforge.json`,
    mime: "application/json",
    content,
    hash: hashContent(content),
  };
}

function nextExportVersion(project: DeckProject): number {
  return project.approvalLog.filter((entry) => entry.stage === "export").length + 1;
}
