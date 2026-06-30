import { useCallback, useEffect, useMemo } from "react";
import {
  BlockedExportPanel,
  ExportDetailsPanel,
  Metric,
  ReadyExportPanel,
} from "@/components/deck/ExportStagePanels";
import { StageHeader, StageScroll, StageShell } from "@/components/deck/stage-shared";
import type { DeckProject } from "@/lib/deck-types";
import { updateProject } from "@/lib/deck-store";
import { evaluateFinalExportGate, type FinalExportGateIssue } from "@/lib/final-export-gate";
import { buildGenerationReport } from "@/lib/generation-report";
import { buildLiveGenerationReportLineage } from "@/lib/live-generation-report-lineage-builder";
import { buildProjectExportPackage, createProjectExportPatch } from "@/lib/project-export";
import type { ExecutionMode } from "@/lib/provider-provenance";

export function ExportStage({
  project,
  executionMode,
}: {
  readonly project: DeckProject;
  readonly executionMode?: ExecutionMode;
}) {
  const layers = project.layers ?? [];
  const approvals = project.approvalLog;
  const exportResult = useMemo(
    () =>
      buildProjectExportPackage(project, {
        now: () => project.exportPackage?.createdAt ?? project.updatedAt,
        version: exportVersion(project),
      }),
    [project],
  );
  const exportPackage = exportResult.kind === "ready" ? exportResult.package : undefined;
  const reportProject = useMemo(
    () => (exportPackage ? { ...project, exportPackage: exportPackage.summary } : project),
    [exportPackage, project],
  );
  const liveReportLineage = useMemo(
    () => buildLiveGenerationReportLineage({ project, exportPackage }),
    [exportPackage, project],
  );
  const reportMd = useMemo(
    () =>
      buildGenerationReport(
        reportProject,
        undefined,
        [],
        project.liveSlideGeneration?.providerLineage ?? [],
        liveReportLineage,
      ),
    [liveReportLineage, project.liveSlideGeneration?.providerLineage, reportProject],
  );
  const finalGate = useMemo(
    () =>
      evaluateFinalExportGate({
        project,
        exportPackage: exportPackage?.summary,
        reportMarkdown: reportMd,
        executionMode,
        lineage: project.liveSlideGeneration?.providerLineage,
        liveReportLineage,
      }),
    [executionMode, exportPackage, liveReportLineage, project, reportMd],
  );
  const exportStatusLabel = exportPackage
    ? finalGate.kind === "ready"
      ? "준비 완료"
      : "검증 필요"
    : "최종화 중";
  const finalize = useCallback(() => {
    if (!exportPackage || finalGate.kind !== "ready") return;
    updateProject(project.id, createProjectExportPatch({ project, exportPackage }));
  }, [exportPackage, finalGate.kind, project]);

  useEffect(() => {
    if (project.stage !== "FINAL_REPORTING" || !exportPackage || finalGate.kind !== "ready") {
      return;
    }
    const timer = setTimeout(finalize, 600);
    return () => clearTimeout(timer);
  }, [exportPackage, finalGate.kind, finalize, project.stage]);

  return (
    <StageShell>
      <StageScroll className="mx-auto max-w-5xl px-4 sm:px-8">
        <StageHeader num="10" sub="Final Report" title="최종 보고 · 내보내기" />
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="슬라이드" value={String(layers.length)} />
          <Metric label="PNG" value={String(exportPackage?.pngFiles.length ?? 0)} />
          <Metric label="승인 이벤트" value={String(approvals.length)} accent />
          <Metric
            label="현재 상태"
            value={exportStatusLabel}
            accent={exportStatusLabel === "검증 필요"}
          />
        </div>
        {exportPackage && finalGate.kind === "ready" ? (
          <ReadyExportPanel
            exportPackage={exportPackage}
            reportMd={reportMd}
            project={project}
            warnings={finalGate.warnings}
            developmentWatermark={finalGate.developmentWatermark}
          />
        ) : (
          <BlockedExportPanel
            issues={exportResult.kind === "blocked" ? exportResult.issues : gateIssues(finalGate)}
          />
        )}
        <ExportDetailsPanel approvals={approvals} reportMd={reportMd} />
      </StageScroll>
    </StageShell>
  );
}

function gateIssues(
  finalGate: ReturnType<typeof evaluateFinalExportGate>,
): readonly FinalExportGateIssue[] {
  return finalGate.kind === "blocked" ? finalGate.issues : [];
}

function exportVersion(project: DeckProject): number | undefined {
  if (!project.exportPackage) return undefined;
  return project.approvalLog.find((entry) => entry.artifactId === project.exportPackage?.artifactId)
    ?.artifactVersion;
}
