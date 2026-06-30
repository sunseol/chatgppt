import type { DeckProject } from "./deck-types";
import type { ProviderArtifactProvenance } from "./provider-provenance";
import type { PromptUsageRecord } from "./prompt-assets";
import type { AuditLogEvent } from "./audit-log";
import { formatAuditLogForReport } from "./audit-log";
import { formatReportCitation } from "./citation-renderer";
import { createCorePromptUsageRecords, formatPromptVersionsForReport } from "./prompt-assets";
import {
  buildMinimalSlideSourceMap,
  formatMinimalSourceMapForReport,
  type MinimalSlideSourceMap,
} from "./slide-source-map";

export function buildGenerationReport(
  project: DeckProject,
  promptUsages: readonly PromptUsageRecord[] = createCorePromptUsageRecords({
    recordedAt: project.createdAt,
  }),
  auditEvents: readonly AuditLogEvent[] = [],
  providerLineage: readonly ProviderArtifactProvenance[] = [],
): string {
  const out: string[] = [];
  const sourceMap =
    project.plan && project.research
      ? buildMinimalSlideSourceMap({ slides: project.plan.slides, research: project.research })
      : undefined;
  out.push(`# Generation Report — ${project.name}`);
  out.push("");
  out.push(`- 생성: ${new Date(project.createdAt).toLocaleString("ko-KR")}`);
  out.push(
    `- 화면 비율: ${project.aspectRatio} · 언어: ${project.language} · 슬라이드: ${project.slideCount}`,
  );
  out.push("");
  out.push("## 1. 사용자 프롬프트");
  out.push(project.initialPrompt);
  appendBrief(project, out);
  appendResearchSources(project, out);
  appendSourceMap(project, out, sourceMap);
  appendDesign(project, out);
  appendSlides(project, out, sourceMap);
  appendApprovals(project, out);
  appendRisks(project, out, sourceMap);
  appendPromptVersions(promptUsages, out);
  appendExport(project, out);
  appendAuditLog(auditEvents, out);
  appendProviderProvenance(providerLineage, out);
  return out.join("\n");
}

function appendBrief(project: DeckProject, out: string[]) {
  if (!project.brief) return;
  out.push("");
  out.push("## 2. 승인된 인터뷰 브리프");
  out.push(`- 목적: ${project.brief.goal}`);
  out.push(`- 청중: ${project.brief.audience}`);
  out.push(`- 톤: ${project.brief.tone.join(", ")}`);
}

function appendResearchSources(project: DeckProject, out: string[]) {
  if (!project.research) return;
  out.push("");
  out.push("## 3. 조사 출처");
  project.research.sources.forEach((source) => out.push(`- ${formatReportCitation(source)}`));
}

function appendSourceMap(
  project: DeckProject,
  out: string[],
  sourceMap: MinimalSlideSourceMap | undefined,
) {
  out.push("");
  if (!sourceMap) {
    out.push("## 4. 슬라이드별 근거 맵");
    out.push("- 없음");
    return;
  }

  out.push(formatMinimalSourceMapForReport(sourceMap));
}

function appendDesign(project: DeckProject, out: string[]) {
  if (!project.design) return;
  out.push("");
  out.push("## 5. 디자인 시스템");
  out.push(
    `- Canvas: ${project.design.canvas.ratio} ${project.design.canvas.w}×${project.design.canvas.h}`,
  );
  out.push(`- Design: ${project.design.id} · ${project.design.approvedHash ?? "unapproved"}`);
  out.push(`- Visual Language: ${project.design.visualLanguage}`);
  if (project.layout) {
    out.push(
      `- Layout Prototype: ${project.layout.id} · ${project.layout.approvedHash ?? "unapproved"}`,
    );
  }
}

function appendSlides(
  project: DeckProject,
  out: string[],
  sourceMap: MinimalSlideSourceMap | undefined,
) {
  if (!project.plan) return;
  out.push("");
  out.push("## 6. 슬라이드");
  project.plan.slides.forEach((slide) => {
    const sourceEntry = sourceMap?.entries.find((entry) => entry.slideNumber === slide.number);
    const layoutSlide = project.layout?.slides.find((item) => item.number === slide.number);
    const layerModel = project.layers?.find((item) => item.slideNumber === slide.number);
    const generatedSlide = project.slides?.find((item) => item.number === slide.number);
    const editableCount = layerModel?.layers.filter((layer) => layer.editable).length ?? 0;
    const layerCount = layerModel?.layers.length ?? 0;
    out.push(`- #${slide.number} ${slide.title} — ${slide.coreMessage}`);
    out.push(`  - Plan: ${project.plan?.id ?? "none"} slide ${slide.number}`);
    out.push(`  - Sources: ${joinOrNone(sourceEntry?.sourceIds ?? [])}`);
    out.push(`  - Datasets: ${joinOrNone(sourceEntry?.datasetIds ?? [])}`);
    if (project.design) {
      out.push(`  - Design: ${project.design.id} · ${project.design.approvedHash ?? "unapproved"}`);
    }
    if (layoutSlide && project.layout) {
      out.push(
        `  - Layout: ${project.layout.id} slide ${slide.number} ${layoutSlide.componentType} · PNG ${
          layoutSlide.layoutPngDataUrl ? "yes" : "no"
        }`,
      );
    }
    if (layerModel) out.push(`  - Editable layers: ${editableCount}/${layerCount}`);
    if (generatedSlide) {
      out.push(
        `  - Generated slide: v${generatedSlide.version} ${generatedSlide.status}${generatedSlide.notes ? ` · note: ${generatedSlide.notes}` : ""}`,
      );
    }
    if (sourceEntry?.rejectedClaimIds.length) {
      out.push(`  - Rejected claims: ${joinOrNone(sourceEntry.rejectedClaimIds)}`);
    }
  });
}

function appendApprovals(project: DeckProject, out: string[]) {
  out.push("");
  out.push("## 7. 승인 로그");
  project.approvalLog.forEach((approval) => {
    const artifact = approval.artifactId
      ? ` · ${approval.artifactType ?? "artifact"} ${approval.artifactId}`
      : "";
    out.push(
      `- ${new Date(approval.at).toISOString()} · ${approval.stage} · ${approval.hash}${artifact}`,
    );
  });
}

function appendRisks(
  project: DeckProject,
  out: string[],
  sourceMap: MinimalSlideSourceMap | undefined,
) {
  out.push("");
  out.push("## 8. 남은 리스크 / 확인 필요");
  let riskCount = 0;
  if (project.brief?.openQuestions.length) {
    project.brief.openQuestions.forEach((question) => out.push(`- ${question}`));
    riskCount += project.brief.openQuestions.length;
  }
  const reviewClaims =
    project.research?.claims.filter(
      (claim) =>
        claim.confidence === "assumption" || claim.status !== "supported" || claim.needsUserReview,
    ) ?? [];
  reviewClaims.forEach((claim) =>
    out.push(`- ${claim.id} [${claim.status}/${claim.confidence}] ${claim.statement}`),
  );
  riskCount += reviewClaims.length;
  if (project.layout?.validationReport) {
    out.push(`- Layout validation: ${project.layout.validationReport.status}`);
    project.layout.validationReport.issues.forEach((issue) =>
      out.push(`  - ${issue.code}: ${issue.message}`),
    );
    riskCount += project.layout.validationReport.issues.length;
  }
  if (project.research?.factCheckReport) {
    const report = project.research.factCheckReport;
    out.push(`- Fact check: ${report.fatalIssueCount} fatal · ${report.summary}`);
    report.issues.forEach((issue) => out.push(`  - ${issue.id}: ${issue.message}`));
    report.uncertainItems.forEach((item) => out.push(`  - 불확실 항목: ${item}`));
    riskCount += report.issues.length + report.uncertainItems.length;
  }
  sourceMap?.issues.forEach((issue) =>
    out.push(`- Source map ${issue.severity}: ${issue.message}`),
  );
  riskCount += sourceMap?.issues.length ?? 0;
  if (riskCount === 0) out.push("- 없음");
}

function appendPromptVersions(promptUsages: readonly PromptUsageRecord[], out: string[]) {
  out.push("");
  out.push(formatPromptVersionsForReport(promptUsages));
}

function appendExport(project: DeckProject, out: string[]) {
  if (!project.exportPackage) return;
  out.push("");
  out.push("## 10. Export 패키지");
  out.push(`- Export: ${project.exportPackage.artifactId} · ${project.exportPackage.artifactHash}`);
  out.push(`- Path: ${project.exportPackage.artifactPath}`);
  out.push(
    `- PNG: ${project.exportPackage.pngCount} · SVG: ${project.exportPackage.svgCount} · Hybrid SVG: ${project.exportPackage.hybridSvgCount} · Project file: ${project.exportPackage.projectFilePath}`,
  );
  if (project.exportPackage.pptxFilePath) {
    out.push(
      `- PPTX: ${project.exportPackage.pptxFilePath} · Background images: ${project.exportPackage.pptxBackgroundImageCount ?? 0}`,
    );
  }
}

function appendAuditLog(auditEvents: readonly AuditLogEvent[], out: string[]) {
  out.push("");
  out.push(formatAuditLogForReport(auditEvents));
}

function appendProviderProvenance(lineage: readonly ProviderArtifactProvenance[], out: string[]) {
  out.push("");
  out.push("## 12. Provider Provenance");
  if (lineage.length === 0) {
    out.push("- 없음");
    return;
  }
  lineage.forEach((item) => {
    out.push(
      [
        `- ${item.artifactId}`,
        item.providerKind,
        item.executionMode,
        item.authMode,
        item.modelOrRuntime,
        `prompt ${item.promptVersion}`,
        `fixture ${item.fixture ? "yes" : "no"}`,
        `${item.durationMs}ms`,
      ].join(" · "),
    );
    const identity = providerIdentity(item);
    if (identity.length > 0) out.push(`  - ${identity.join(" · ")}`);
    out.push(`  - inputs ${joinOrNone(item.inputArtifactIds)}`);
  });
}

function providerIdentity(item: ProviderArtifactProvenance): readonly string[] {
  return [
    ...(item.requestId === undefined ? [] : [`request ${item.requestId}`]),
    ...(item.turnId === undefined ? [] : [`turn ${item.turnId}`]),
    ...(item.threadId === undefined ? [] : [`thread ${item.threadId}`]),
  ];
}

function joinOrNone(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}
