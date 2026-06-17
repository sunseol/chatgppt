import { createArtifactRecord, type ArtifactRecord, type ArtifactType } from "./artifacts";
import type { DeckProject, GeneratedSlide, Stage, StepKey } from "./deck-types";
import { createDeckProject } from "./project-creation";
import {
  buildProjectExportPackage,
  createProjectExportPatch,
  type ProjectExportPackage,
} from "./project-export";
import { buildGenerationReport } from "./generation-report";
import { createMockDeckProvider } from "./mock-provider";
import { nextStageAfterApproval } from "./workflow-engine";

export type HappyPathE2eOptions = {
  readonly now?: () => number;
  readonly projectId?: string;
  readonly prompt?: string;
  readonly slideCount?: number;
};

export type HappyPathE2eFinalChecks = {
  readonly workflowComplete: boolean;
  readonly artifactsCreated: boolean;
  readonly exportReady: boolean;
  readonly reportReady: boolean;
};

export type HappyPathE2eResult = {
  readonly project: DeckProject;
  readonly visitedStages: readonly Stage[];
  readonly artifacts: readonly ArtifactRecord[];
  readonly exportPackage: ProjectExportPackage;
  readonly generationReport: string;
  readonly reportArtifact: ArtifactRecord;
  readonly finalChecks: HappyPathE2eFinalChecks;
};

type Approvable = {
  readonly approvedHash?: string;
};

const DEFAULT_PROMPT =
  "Create an investor-ready Korean climate SaaS pitch deck with sourced market evidence.";

export async function runMockHappyPathE2e(
  options: HappyPathE2eOptions = {},
): Promise<HappyPathE2eResult> {
  const now = options.now ?? Date.now;
  const provider = createMockDeckProvider();
  const status = await provider.getStatus();
  if (status.kind !== "connected") throw new Error(`Mock provider unavailable: ${status.message}`);

  const visitedStages: Stage[] = [];
  const artifacts: ArtifactRecord[] = [];
  let project = createDeckProject(
    {
      name: "Happy Path Benchmark",
      initialPrompt: options.prompt ?? DEFAULT_PROMPT,
      slideCount: options.slideCount ?? 5,
      aspectRatio: "16:9",
      language: "ko",
    },
    { createId: () => options.projectId ?? "p_happy_path", now },
  );
  visit(project, visitedStages);

  project = move(project, "INTERVIEWING", visitedStages, now);
  const briefDraft = await provider.createInterviewBrief({
    prompt: project.initialPrompt,
    slideCount: project.slideCount,
    aspectRatio: project.aspectRatio,
  });
  project = move(project, "INTERVIEW_APPROVAL_PENDING", visitedStages, now);
  const briefArtifact = artifact(project, "brief", 1, briefDraft, now);
  const brief = withApprovedHash(briefDraft, briefArtifact.hash);
  project = approve(project, "interview", briefArtifact, visitedStages, now, { brief });
  artifacts.push(briefArtifact);

  const researchDraft = await provider.createResearchPack({ brief });
  project = move(project, "RESEARCH_APPROVAL_PENDING", visitedStages, now);
  const researchArtifact = artifact(project, "research", 1, researchDraft, now);
  const research = withApprovedHash(researchDraft, researchArtifact.hash);
  project = approve(project, "research", researchArtifact, visitedStages, now, { research });
  artifacts.push(researchArtifact);

  const planDraft = await provider.createDeckPlan({ brief, research });
  project = move(project, "PLAN_APPROVAL_PENDING", visitedStages, now);
  const planArtifact = artifact(project, "plan", 1, planDraft, now);
  const plan = withApprovedHash(planDraft, planArtifact.hash);
  project = approve(project, "plan", planArtifact, visitedStages, now, { plan });
  artifacts.push(planArtifact);

  const designDraft = await provider.createDesignSystem({ brief, plan });
  project = move(project, "DESIGN_APPROVAL_PENDING", visitedStages, now);
  const designArtifact = artifact(project, "design", 1, designDraft, now);
  const design = withApprovedHash(designDraft, designArtifact.hash);
  project = approve(project, "design", designArtifact, visitedStages, now, { design });
  artifacts.push(designArtifact);

  const layoutDraft = await provider.createLayoutPrototype({ plan, design });
  project = move(project, "LAYOUT_APPROVAL_PENDING", visitedStages, now);
  const layoutArtifact = artifact(project, "layout", 1, layoutDraft, now);
  const layout = withApprovedHash(layoutDraft, layoutArtifact.hash);
  project = approve(project, "layout", layoutArtifact, visitedStages, now, { layout });
  artifacts.push(layoutArtifact);

  project = move(project, "GENERATING_SLIDES", visitedStages, now);
  const generatedSlides = await provider.createGeneratedSlides({ plan });
  project = { ...project, slides: generatedSlides };
  project = move(project, "SLIDE_REVIEW_PENDING", visitedStages, now);
  const approvedSlides = generatedSlides.map(
    (slide): GeneratedSlide => ({ ...slide, status: "approved" }),
  );
  project = { ...project, slides: approvedSlides };
  const slidesArtifact = artifact(project, "slides", 1, approvedSlides, now);
  project = approve(project, "review", slidesArtifact, visitedStages, now);
  artifacts.push(slidesArtifact);

  project = move(project, "VECTORIZING", visitedStages, now);
  const layers = await provider.createEditableLayers({ plan, design });
  project = move({ ...project, layers }, "EDITABLE_REVIEW_PENDING", visitedStages, now);
  const layersArtifact = artifact(project, "layers", 1, layers, now);
  project = approve(project, "vectorize", layersArtifact, visitedStages, now, { layers });
  artifacts.push(layersArtifact);

  const editorArtifact = artifact(project, "project", 1, { layers }, now);
  project = approve(project, "editor", editorArtifact, visitedStages, now);
  artifacts.push(editorArtifact);

  const exportResult = buildProjectExportPackage(project, { now, version: 1 });
  if (exportResult.kind === "blocked") {
    throw new Error(`Happy path export blocked: ${exportResult.issues[0]?.message ?? "unknown"}`);
  }
  const exportPackage = exportResult.package;
  project = { ...project, ...createProjectExportPatch({ project, exportPackage }) };
  visit(project, visitedStages);
  artifacts.push(exportPackage.artifact);

  const generationReport = buildGenerationReport(project);
  const reportArtifact = createArtifactRecord({
    projectId: project.id,
    type: "report",
    version: 1,
    content: generationReport,
    createdAt: now(),
  });
  artifacts.push(reportArtifact);

  return {
    project,
    visitedStages,
    artifacts,
    exportPackage,
    generationReport,
    reportArtifact,
    finalChecks: finalChecks(project, artifacts, exportPackage, generationReport),
  };
}

function approve(
  project: DeckProject,
  step: StepKey,
  artifactRecord: ArtifactRecord,
  visitedStages: Stage[],
  now: () => number,
  patch: Partial<DeckProject> = {},
): DeckProject {
  const nextStage = nextStageAfterApproval(step);
  const nextProject: DeckProject = {
    ...project,
    ...patch,
    stage: nextStage,
    approvalLog: [
      ...project.approvalLog,
      {
        stage: step,
        at: artifactRecord.createdAt,
        hash: artifactRecord.hash,
        artifactId: artifactRecord.id,
        artifactVersion: artifactRecord.version,
        artifactType: artifactRecord.type,
      },
    ],
    updatedAt: now(),
  };
  visit(nextProject, visitedStages);
  return nextProject;
}

function move(
  project: DeckProject,
  stage: Stage,
  visitedStages: Stage[],
  now: () => number,
): DeckProject {
  const nextProject = { ...project, stage, updatedAt: now() };
  visit(nextProject, visitedStages);
  return nextProject;
}

function visit(project: DeckProject, visitedStages: Stage[]) {
  visitedStages.push(project.stage);
}

function withApprovedHash<T extends Approvable>(value: T, hash: string): T {
  return { ...value, approvedHash: hash };
}

function artifact(
  project: DeckProject,
  type: ArtifactType,
  version: number,
  content: unknown,
  now: () => number,
): ArtifactRecord {
  return createArtifactRecord({
    projectId: project.id,
    type,
    version,
    content: JSON.stringify(content),
    createdAt: now(),
  });
}

function finalChecks(
  project: DeckProject,
  artifacts: readonly ArtifactRecord[],
  exportPackage: ProjectExportPackage,
  generationReport: string,
): HappyPathE2eFinalChecks {
  const hasSlideExports =
    exportPackage.pngFiles.length === project.slideCount &&
    exportPackage.svgFiles.length === project.slideCount &&
    exportPackage.hybridSvgFiles.length === project.slideCount;
  return {
    workflowComplete: project.stage === "EXPORT_READY",
    artifactsCreated: artifacts.length >= 10,
    exportReady:
      hasSlideExports &&
      exportPackage.pptxExport.kind === "ready" &&
      exportPackage.pptxExport.file.filename.endsWith(".pptx") &&
      project.exportPackage?.artifactId === exportPackage.artifact.id,
    reportReady:
      generationReport.includes("# Generation Report") &&
      generationReport.includes(exportPackage.artifact.id),
  };
}
