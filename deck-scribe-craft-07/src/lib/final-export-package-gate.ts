import type { DeckProject, ProjectExportSummary } from "./deck-types";
import type { FinalExportGateIssue } from "./final-export-gate";
import type { LiveSlideReportLineage } from "./live-generation-report-lineage";

export function exportPackageIssues(
  project: DeckProject,
  summary: ProjectExportSummary | undefined,
  liveReportLineage: readonly LiveSlideReportLineage[] | undefined,
): readonly FinalExportGateIssue[] {
  if (!summary) {
    return [{ code: "missing_export_package", message: "내보내기 파일을 먼저 준비해야 합니다." }];
  }
  const issues: FinalExportGateIssue[] = [];
  if (summary.pngCount <= 0) {
    issues.push({ code: "missing_png_export", message: "PNG 파일이 1개 이상 필요합니다." });
  }
  if (summary.svgCount <= 0) {
    issues.push({ code: "missing_svg_export", message: "SVG 파일이 1개 이상 필요합니다." });
  }
  if (summary.hybridSvgCount <= 0) {
    issues.push({
      code: "missing_hybrid_svg_export",
      message: "편집용 SVG 파일이 1개 이상 필요합니다.",
    });
  }
  if (!summary.pptxFilePath || summary.pptxFilePath.trim().length === 0) {
    issues.push({ code: "missing_pptx_export", message: "PPTX 파일이 필요합니다." });
  }
  const generatedImageCount = Math.max(
    project.liveSlideGeneration?.artifacts.length ?? 0,
    liveReportLineage?.length ?? 0,
  );
  const exportedBackgroundCount = summary.pptxBackgroundImageCount ?? 0;
  if (generatedImageCount > 0 && exportedBackgroundCount < generatedImageCount) {
    issues.push({
      code: "missing_pptx_background_images",
      message: "GPT 이미지 생성 산출물이 PPTX 배경 이미지로 포함되어야 합니다.",
    });
  }
  if (summary.projectFilePath.trim().length === 0) {
    issues.push({ code: "missing_project_file", message: "프로젝트 파일이 필요합니다." });
  }
  return issues;
}
