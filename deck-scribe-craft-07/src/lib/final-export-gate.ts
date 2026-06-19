import { hashContent } from "./artifacts";
import type { DeckProject, ProjectExportSummary } from "./deck-types";
import {
  liveReportGateIssues,
  type LiveReportGateIssueCode,
} from "./final-export-live-report-gate";
import type { LiveSlideReportLineage } from "./live-generation-report-lineage";
import { type ExecutionMode, type ProviderArtifactProvenance } from "./provider-provenance";
import { workflowErrorBlocksFinalApproval } from "./workflow-error-policy";

export type FinalExportGateIssueCode =
  | "invalidated_artifact"
  | "missing_export_package"
  | "missing_png_export"
  | "missing_svg_export"
  | "missing_hybrid_svg_export"
  | "missing_project_file"
  | "missing_generation_report"
  | "fatal_workflow_error"
  | "mock_lineage_contamination"
  | "fixture_lineage_contamination"
  | LiveReportGateIssueCode;

export type FinalExportGateIssue = {
  readonly code: FinalExportGateIssueCode;
  readonly message: string;
  readonly step?: string;
  readonly slideNumber?: number;
  readonly artifactId?: string;
  readonly upstreamArtifactIds?: readonly string[];
};

export type FinalExportGateWarningCode = "development_mock_lineage" | "development_fixture_lineage";

export type FinalExportGateWarning = {
  readonly code: FinalExportGateWarningCode;
  readonly message: string;
  readonly artifactId: string;
  readonly upstreamArtifactIds: readonly string[];
};

export type FinalExportGateResult =
  | {
      readonly kind: "ready";
      readonly exportArtifactId: string;
      readonly exportArtifactHash: string;
      readonly reportHash: string;
      readonly warnings: readonly FinalExportGateWarning[];
      readonly developmentWatermark?: "MOCK MODE";
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly FinalExportGateIssue[];
    };

export function evaluateFinalExportGate(input: {
  readonly project: DeckProject;
  readonly exportPackage?: ProjectExportSummary;
  readonly reportMarkdown?: string;
  readonly executionMode?: ExecutionMode;
  readonly lineage?: readonly ProviderArtifactProvenance[];
  readonly liveReportLineage?: readonly LiveSlideReportLineage[];
}): FinalExportGateResult {
  const summary = input.exportPackage ?? input.project.exportPackage;
  const reportMarkdown = input.reportMarkdown ?? "";
  const issues = [
    ...invalidatedIssues(input.project),
    ...workflowErrorIssues(input.project),
    ...exportPackageIssues(summary),
    ...reportIssues(reportMarkdown, summary),
    ...productionLineageIssues(input.executionMode, input.lineage ?? []),
    ...liveReportGateIssues({
      executionMode: input.executionMode,
      expectedSlideCount: input.project.slideCount,
      providerLineage: input.lineage ?? [],
      liveReportLineage: input.liveReportLineage,
    }),
  ];
  const warnings = developmentLineageWarnings(input.executionMode, input.lineage ?? []);
  if (issues.length > 0) return { kind: "blocked", issues };
  if (!summary) {
    return {
      kind: "blocked",
      issues: [
        { code: "missing_export_package", message: "내보내기 파일을 먼저 준비해야 합니다." },
      ],
    };
  }
  return {
    kind: "ready",
    exportArtifactId: summary.artifactId,
    exportArtifactHash: summary.artifactHash,
    reportHash: hashContent(reportMarkdown),
    warnings,
    ...(warnings.length > 0 ? { developmentWatermark: "MOCK MODE" as const } : {}),
  };
}

function productionLineageIssues(
  executionMode: ExecutionMode | undefined,
  lineage: readonly ProviderArtifactProvenance[],
): readonly FinalExportGateIssue[] {
  if (executionMode !== "production") return [];
  return [
    ...lineage
      .filter((item) => item.providerKind === "mock")
      .map((item) => ({
        code: "mock_lineage_contamination" as const,
        artifactId: item.artifactId,
        upstreamArtifactIds: item.inputArtifactIds,
        message: `Production export includes mock artifact ${item.artifactId}${formatUpstreamPath(item)}.`,
      })),
    ...lineage
      .filter((item) => item.fixture)
      .map((item) => ({
        code: "fixture_lineage_contamination" as const,
        artifactId: item.artifactId,
        upstreamArtifactIds: item.inputArtifactIds,
        message: `Production export includes fixture artifact ${item.artifactId}${formatUpstreamPath(item)}.`,
      })),
  ];
}

function developmentLineageWarnings(
  executionMode: ExecutionMode | undefined,
  lineage: readonly ProviderArtifactProvenance[],
): readonly FinalExportGateWarning[] {
  if (executionMode === "production") return [];
  return [
    ...lineage
      .filter((item) => item.providerKind === "mock")
      .map((item) =>
        warning(
          "development_mock_lineage",
          item,
          `Development export includes mock artifact ${item.artifactId}${formatUpstreamPath(item)}.`,
        ),
      ),
    ...lineage
      .filter((item) => item.fixture)
      .map((item) =>
        warning(
          "development_fixture_lineage",
          item,
          `Development export includes fixture artifact ${item.artifactId}${formatUpstreamPath(item)}.`,
        ),
      ),
  ];
}

function warning(
  code: FinalExportGateWarningCode,
  item: ProviderArtifactProvenance,
  message: string,
): FinalExportGateWarning {
  return {
    code,
    message,
    artifactId: item.artifactId,
    upstreamArtifactIds: item.inputArtifactIds,
  };
}

function formatUpstreamPath(item: ProviderArtifactProvenance): string {
  return item.inputArtifactIds.length === 0
    ? ""
    : `; upstream path: ${item.inputArtifactIds.join(" -> ")} -> ${item.artifactId}`;
}

function workflowErrorIssues(project: DeckProject): readonly FinalExportGateIssue[] {
  return (project.workflowErrors ?? []).filter(workflowErrorBlocksFinalApproval).map((error) => ({
    code: "fatal_workflow_error",
    step: error.stage,
    message: `${error.stage} 단계의 오류를 해결해야 내보낼 수 있습니다.`,
  }));
}

function invalidatedIssues(project: DeckProject): readonly FinalExportGateIssue[] {
  return Object.entries(project.invalidated)
    .filter((entry) => entry[1] === true)
    .map(([step]) => ({
      code: "invalidated_artifact",
      step,
      message: `${step} 단계 결과를 다시 확인해야 합니다.`,
    }));
}

function exportPackageIssues(
  summary: ProjectExportSummary | undefined,
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
  if (summary.projectFilePath.trim().length === 0) {
    issues.push({ code: "missing_project_file", message: "프로젝트 파일이 필요합니다." });
  }
  return issues;
}

function reportIssues(
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
