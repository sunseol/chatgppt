import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StageHeader } from "@/components/deck/stage-shared";
import type { DeckProject } from "@/lib/deck-types";
import { updateProject } from "@/lib/deck-store";
import { evaluateFinalExportGate, type FinalExportGateIssue } from "@/lib/final-export-gate";
import { buildGenerationReport } from "@/lib/generation-report";
import {
  buildProjectExportPackage,
  createProjectExportPatch,
  type ProjectExportPackage,
} from "@/lib/project-export";
import { CheckCircle2 } from "lucide-react";

export function ExportStage({ project }: { readonly project: DeckProject }) {
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
  const reportMd = useMemo(() => buildGenerationReport(reportProject), [reportProject]);
  const finalGate = useMemo(
    () =>
      evaluateFinalExportGate({
        project,
        exportPackage: exportPackage?.summary,
        reportMarkdown: reportMd,
      }),
    [exportPackage, project, reportMd],
  );
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
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <StageHeader num="10" sub="Final Report" title="최종 보고 · 내보내기" />
        <div className="mb-8 grid grid-cols-4 gap-3">
          <Metric label="슬라이드" value={String(layers.length)} />
          <Metric label="PNG" value={String(exportPackage?.pngFiles.length ?? 0)} />
          <Metric label="승인 이벤트" value={String(approvals.length)} accent />
          <Metric
            label="현재 상태"
            value={project.stage === "EXPORT_READY" ? "준비 완료" : "최종화 중"}
          />
        </div>
        {exportPackage && finalGate.kind === "ready" ? (
          <ReadyExportPanel exportPackage={exportPackage} reportMd={reportMd} project={project} />
        ) : (
          <BlockedExportPanel
            issues={exportResult.kind === "blocked" ? exportResult.issues : gateIssues(finalGate)}
          />
        )}
        <ApprovalLog approvals={approvals} />
        <h2 className="mt-10 mb-3 font-serif text-2xl">Generation Report</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap border border-border bg-paper p-4 font-mono text-xs leading-relaxed">
          {reportMd}
        </pre>
      </div>
    </div>
  );
}

function ReadyExportPanel({
  exportPackage,
  reportMd,
  project,
}: {
  readonly exportPackage: ProjectExportPackage;
  readonly reportMd: string;
  readonly project: DeckProject;
}) {
  const pptxFile =
    exportPackage.pptxExport.kind === "ready" ? exportPackage.pptxExport.file : undefined;
  return (
    <>
      <div className="mb-4 border border-border bg-paper px-4 py-3 text-xs">
        <div className="font-mono break-all">{exportPackage.summary.artifactId}</div>
        <div className="mt-1 font-mono text-muted-foreground break-all">
          {exportPackage.summary.artifactHash}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => downloadText(`${project.name}_report.md`, reportMd, "text/markdown")}
        >
          Generation Report (.md)
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadText(
              exportPackage.projectFile.filename,
              exportPackage.projectFile.content,
              exportPackage.projectFile.mime,
            )
          }
        >
          Project (.json)
        </Button>
        {exportPackage.pngFiles.map((file) => (
          <Button key={file.path} variant="outline" onClick={() => downloadDataUrl(file)}>
            PNG Slide {String(file.slideNumber).padStart(2, "0")}
          </Button>
        ))}
        {exportPackage.svgFiles.map((file) => (
          <Button
            key={file.path}
            variant="outline"
            onClick={() => downloadText(file.filename, file.content, file.mime)}
          >
            SVG Slide {String(file.slideNumber).padStart(2, "0")}
          </Button>
        ))}
        {exportPackage.hybridSvgFiles.map((file) => (
          <Button
            key={file.path}
            variant="outline"
            onClick={() => downloadText(file.filename, file.content, file.mime)}
          >
            Hybrid SVG Slide {String(file.slideNumber).padStart(2, "0")}
          </Button>
        ))}
        {pptxFile ? (
          <Button variant="outline" onClick={() => downloadDataUrl(pptxFile)}>
            PPTX Package
          </Button>
        ) : null}
      </div>
    </>
  );
}

function BlockedExportPanel({
  issues,
}: {
  readonly issues: readonly { readonly code: string; readonly message: string }[];
}) {
  return (
    <div className="border border-destructive/40 bg-paper p-4 text-sm">
      <div className="font-medium">Final export blocked</div>
      <ul className="mt-2 list-disc pl-5 text-muted-foreground">
        {issues.map((issue) => (
          <li key={`${issue.code}:${issue.message}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

function gateIssues(
  finalGate: ReturnType<typeof evaluateFinalExportGate>,
): readonly FinalExportGateIssue[] {
  return finalGate.kind === "blocked" ? finalGate.issues : [];
}

function ApprovalLog({ approvals }: { readonly approvals: DeckProject["approvalLog"] }) {
  return (
    <>
      <h2 className="mt-10 mb-3 font-serif text-2xl">승인 로그</h2>
      <ul className="divide-y divide-border border border-border bg-paper text-sm">
        {approvals.map((approval, index) => (
          <li
            key={`${approval.stage}:${index}`}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-medium">{approval.stage}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{approval.hash}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(approval.at).toLocaleString("ko-KR")}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  readonly label: string;
  readonly value: string;
  readonly accent?: boolean;
}) {
  return (
    <div className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-serif text-3xl ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

function exportVersion(project: DeckProject): number | undefined {
  if (!project.exportPackage) return undefined;
  return project.approvalLog.find((entry) => entry.artifactId === project.exportPackage?.artifactId)
    ?.artifactVersion;
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(file: { readonly filename: string; readonly dataUrl: string }) {
  const anchor = document.createElement("a");
  anchor.href = file.dataUrl;
  anchor.download = file.filename;
  anchor.click();
}
