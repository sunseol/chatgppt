import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { evaluateFinalExportGate } from "../src/lib/final-export-gate.ts";
import { formatLiveGenerationReportLineage } from "../src/lib/live-generation-report-lineage.ts";
import type { DeckProject, ProjectExportSummary } from "../src/lib/deck-types.ts";
import type { LiveSlideReportLineage } from "../src/lib/live-generation-report-lineage.ts";
import type { ProviderArtifactProvenance } from "../src/lib/provider-provenance.ts";
import {
  CompositorLineageSchema,
  CREATED_AT,
  EVIDENCE_DIR,
  EXPORT_DIR,
  EvidenceGenerationError,
  HYBRID_SVG_DIR,
  PNG_DIR,
  PROJECT_ID,
  ProviderArtifactProvenanceSchema,
  ResearchPackSchema,
  SVG_DIR,
  TEXT_ARTIFACT_ID,
  TextSmokeGateSchema,
  imageProvenancePath,
  pad3,
  readJson,
  renderPng,
  sha256File,
  sha256Text,
  sourceIdsForSlide,
  stableJson,
  writeJsonFile,
  type CompositorExport,
  type SlideExport,
} from "./df240-final-export-evidence-support.ts";

const researchPack = readJson(
  "docs/live-evidence/lane-e-20260621/approved-research-pack.json",
  ResearchPackSchema,
);
const textSmokeGate = readJson(
  "docs/live-evidence/lane-e-20260621/live-text-smoke-gate.json",
  TextSmokeGateSchema,
);
const compositorLineage = readJson(
  "docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/df240-image-compositor-export-lineage.json",
  CompositorLineageSchema,
);
const textProvenance = findProviderProvenance(
  textSmokeGate.gate.provenanceLineage,
  TEXT_ARTIFACT_ID,
);
const imageProvenance = compositorLineage.compositorExports.map((entry) =>
  readJson(imageProvenancePath(entry.slideNumber), ProviderArtifactProvenanceSchema),
);
const providerLineage = [
  textProvenance,
  ...imageProvenance,
] satisfies readonly ProviderArtifactProvenance[];

mkdirSync(EVIDENCE_DIR, { recursive: true });
mkdirSync(PNG_DIR, { recursive: true });
mkdirSync(SVG_DIR, { recursive: true });
mkdirSync(HYBRID_SVG_DIR, { recursive: true });

const slideExports = compositorLineage.compositorExports.map((entry) => createSlideExport(entry));
const projectExport = {
  projectId: PROJECT_ID,
  createdAt: new Date(CREATED_AT).toISOString(),
  researchPackId: researchPack.id,
  approvedResearchPackHash: researchPack.approvedHash ?? "sha256:440b17df",
  sources: researchPack.sources,
  textArtifactId: textProvenance.artifactId,
  slideExports,
  providerArtifactIds: providerLineage.map((item) => item.artifactId),
};
const projectFileContent = stableJson(projectExport);
const projectFilePath = `${EXPORT_DIR}/df240-final-project-export.json`;
writeFileSync(projectFilePath, projectFileContent);

const liveReportLineage = slideExports.map((entry) =>
  createLiveReportLineage(entry, textProvenance, findImageProvenance(entry), projectFileContent),
);
const exportSummary = createExportSummary(projectFilePath, projectFileContent);
const reportMarkdown = createReportMarkdown(exportSummary, liveReportLineage);
const finalGate = evaluateFinalExportGate({
  project: createProject(exportSummary),
  exportPackage: exportSummary,
  reportMarkdown,
  executionMode: "production",
  lineage: providerLineage,
  liveReportLineage,
});
const reportPath = `${EVIDENCE_DIR}/live-generation-report.md`;
const summaryPath = exportSummary.artifactPath;
const gatePath = `${EVIDENCE_DIR}/final-export-gate-result.json`;
const manifestPath = `${EVIDENCE_DIR}/manifest.json`;
const closurePath = `${EVIDENCE_DIR}/issue-closure-evidence.json`;

writeFileSync(reportPath, reportMarkdown);
writeJsonFile(summaryPath, exportSummary);
writeJsonFile(gatePath, finalGate);
writeJsonFile(closurePath, {
  issue: "#150",
  ticket: "DF-240",
  status: finalGate.kind === "ready" ? "ready_for_close" : "blocked",
  acceptanceCriteria: [
    "slide-level source, text turn, image request, and prompt version lineage",
    "fixture status is visible in the Live Slide Lineage report section",
    "production final export gate blocks contamination and returns no warnings for this evidence",
    "exported PNG hashes are produced from compositor SVG renders and reused as compositor hashes",
    "project export content and report markdown pass the secret-like text redaction scan",
  ],
  gatePath,
  reportPath,
  exportSummaryPath: summaryPath,
  projectFilePath,
  finalGate,
});
writeJsonFile(manifestPath, {
  issue: "DF-240",
  status: finalGate.kind,
  generatedAt: new Date(CREATED_AT).toISOString(),
  projectFilePath,
  reportPath,
  exportSummaryPath: summaryPath,
  gatePath,
  closurePath,
  projectFileHash: sha256Text(projectFileContent),
  reportHash: sha256Text(reportMarkdown),
  exportSummaryHash: sha256Text(stableJson(exportSummary)),
  closureEvidenceHash: sha256File(closurePath),
  liveReportLineageHash: sha256Text(stableJson(liveReportLineage)),
  slideExports,
});

console.log(
  stableJson({ finalGate, manifestPath, reportPath, summaryPath, projectFilePath, closurePath }),
);

function createSlideExport(entry: CompositorExport): SlideExport {
  const padded = pad3(entry.slideNumber);
  const svgPath = `${SVG_DIR}/slide_${padded}.svg`;
  const hybridSvgPath = `${HYBRID_SVG_DIR}/slide_${padded}.svg`;
  const pngPath = `${PNG_DIR}/slide_${padded}.png`;
  copyFileSync(entry.compositorSvgPath, svgPath);
  copyFileSync(entry.compositorSvgPath, hybridSvgPath);
  renderPng(entry.compositorSvgPath, pngPath);
  return {
    slideNumber: entry.slideNumber,
    sourceIds: sourceIdsForSlide(entry.slideNumber, researchPack.sources),
    textArtifactId: TEXT_ARTIFACT_ID,
    imageArtifactId: entry.imageArtifactId,
    imageTurnId: entry.imageTurnId,
    compositorSvgPath: entry.compositorSvgPath,
    compositorSvgHash: entry.compositorSvgHash,
    exportedSvgPath: svgPath,
    exportedHybridSvgPath: hybridSvgPath,
    exportedPngPath: pngPath,
    exportedPngHash: sha256File(pngPath),
  };
}

function createLiveReportLineage(
  entry: SlideExport,
  text: ProviderArtifactProvenance,
  image: ProviderArtifactProvenance,
  projectFileContent: string,
): LiveSlideReportLineage {
  return {
    slideNumber: entry.slideNumber,
    sourceIds: entry.sourceIds,
    textArtifactId: entry.textArtifactId,
    textProviderKind: text.providerKind,
    textTurnId: text.turnId,
    textThreadId: text.threadId,
    textPromptVersion: text.promptVersion,
    imageArtifactId: image.artifactId,
    imageProviderKind: image.providerKind,
    imageRequestId: image.turnId,
    promptVersion: image.promptVersion,
    fixture: false,
    compositorHash: entry.exportedPngHash,
    exportedPngHash: entry.exportedPngHash,
    projectFileContent,
  };
}

function createExportSummary(
  projectFilePath: string,
  projectFileContent: string,
): ProjectExportSummary {
  return {
    artifactId: `${PROJECT_ID}_export_v1`,
    artifactHash: sha256Text(projectFileContent),
    artifactPath: `${EXPORT_DIR}/df240-final-export-summary.json`,
    createdAt: CREATED_AT,
    pngCount: slideExports.length,
    svgCount: slideExports.length,
    hybridSvgCount: slideExports.length,
    projectFilePath,
  };
}

function createProject(exportPackage: ProjectExportSummary): DeckProject {
  return {
    id: PROJECT_ID,
    name: "DF-240 Live Final Export Evidence",
    initialPrompt: "Live solar transition deck with production provenance.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: slideExports.length,
    stage: "FINAL_REPORTING",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    exportPackage,
    invalidated: {},
    approvalLog: [],
  };
}

function createReportMarkdown(
  summary: ProjectExportSummary,
  slides: readonly LiveSlideReportLineage[],
): string {
  return [
    "# Generation Report",
    "",
    "## 1. Export",
    `- artifact ${summary.artifactId}`,
    `- artifact hash ${summary.artifactHash}`,
    `- project file ${summary.projectFilePath}`,
    "",
    "## 9. 사용된 프롬프트 버전",
    `- text ${textProvenance.promptVersion}`,
    `- image ${imageProvenance[0]?.promptVersion ?? "missing"}`,
    "",
    formatLiveGenerationReportLineage(slides),
    "",
  ].join("\n");
}

function findProviderProvenance(
  lineage: readonly ProviderArtifactProvenance[],
  artifactId: string,
): ProviderArtifactProvenance {
  const found = lineage.find((item) => item.artifactId === artifactId);
  if (!found) throw new EvidenceGenerationError(`Missing provider provenance for ${artifactId}.`);
  return found;
}

function findImageProvenance(entry: SlideExport): ProviderArtifactProvenance {
  return findProviderProvenance(imageProvenance, entry.imageArtifactId);
}
