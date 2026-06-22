import type { ProjectExportSummary } from "./deck-types";
import type { FinalExportGateIssue } from "./final-export-gate";
import {
  formatLiveGenerationReportLineage,
  type LiveSlideReportLineage,
} from "./live-generation-report-lineage";
import type { ExecutionMode } from "./provider-provenance";
import { redactSensitiveText } from "./redaction";

export function finalExportReportIssues(input: {
  readonly executionMode: ExecutionMode | undefined;
  readonly reportMarkdown: string;
  readonly summary: ProjectExportSummary | undefined;
  readonly liveReportLineage: readonly LiveSlideReportLineage[] | undefined;
  readonly hasLiveReportIssues: boolean;
}): readonly FinalExportGateIssue[] {
  return [
    ...reportShapeIssues(input.reportMarkdown, input.summary),
    ...reportSecretIssues(input.executionMode, input.reportMarkdown),
    ...liveReportSectionIssues(input),
  ];
}

function reportShapeIssues(
  reportMarkdown: string,
  summary: ProjectExportSummary | undefined,
): readonly FinalExportGateIssue[] {
  const hasReport = reportMarkdown.startsWith("# Generation Report");
  const hasPromptVersions = reportMarkdown.includes("## 9. 사용된 프롬프트 버전");
  const hasExportReference = summary ? reportMarkdown.includes(summary.artifactId) : false;
  if (hasReport && hasPromptVersions && hasExportReference) return [];
  return [
    {
      code: "missing_generation_report",
      message: "생성 보고서에 프롬프트 버전과 내보내기 정보가 필요합니다.",
    },
  ];
}

function reportSecretIssues(
  executionMode: ExecutionMode | undefined,
  reportMarkdown: string,
): readonly FinalExportGateIssue[] {
  if (executionMode !== "production") return [];
  if (redactSensitiveText(reportMarkdown) === reportMarkdown) return [];
  return [
    {
      code: "secret_leak",
      message: "생성 보고서에 원문 secret-like 텍스트가 포함되어 있습니다.",
    },
  ];
}

function liveReportSectionIssues(input: {
  readonly executionMode: ExecutionMode | undefined;
  readonly reportMarkdown: string;
  readonly liveReportLineage: readonly LiveSlideReportLineage[] | undefined;
  readonly hasLiveReportIssues: boolean;
}): readonly FinalExportGateIssue[] {
  if (
    input.executionMode !== "production" ||
    input.hasLiveReportIssues ||
    !input.liveReportLineage?.length
  ) {
    return [];
  }
  const expectedSection = formatLiveGenerationReportLineage(input.liveReportLineage);
  if (input.reportMarkdown.includes(expectedSection)) return [];
  return [
    {
      code: "missing_live_report_lineage_section",
      message: "생성 보고서에 검증된 Live Slide Lineage 섹션이 필요합니다.",
    },
  ];
}
