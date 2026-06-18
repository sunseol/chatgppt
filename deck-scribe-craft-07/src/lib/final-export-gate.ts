import { hashContent } from "./artifacts";
import type { DeckProject, ProjectExportSummary } from "./deck-types";
import { workflowErrorBlocksFinalApproval } from "./workflow-error-policy";

export type FinalExportGateIssueCode =
  | "invalidated_artifact"
  | "missing_export_package"
  | "missing_png_export"
  | "missing_svg_export"
  | "missing_hybrid_svg_export"
  | "missing_project_file"
  | "missing_generation_report"
  | "fatal_workflow_error";

export type FinalExportGateIssue = {
  readonly code: FinalExportGateIssueCode;
  readonly message: string;
  readonly step?: string;
};

export type FinalExportGateResult =
  | {
      readonly kind: "ready";
      readonly exportArtifactId: string;
      readonly exportArtifactHash: string;
      readonly reportHash: string;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly FinalExportGateIssue[];
    };

export function evaluateFinalExportGate(input: {
  readonly project: DeckProject;
  readonly exportPackage?: ProjectExportSummary;
  readonly reportMarkdown?: string;
}): FinalExportGateResult {
  const summary = input.exportPackage ?? input.project.exportPackage;
  const reportMarkdown = input.reportMarkdown ?? "";
  const issues = [
    ...invalidatedIssues(input.project),
    ...workflowErrorIssues(input.project),
    ...exportPackageIssues(summary),
    ...reportIssues(reportMarkdown, summary),
  ];
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
  };
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
