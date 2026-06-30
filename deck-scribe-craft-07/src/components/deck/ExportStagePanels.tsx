import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeckProject } from "@/lib/deck-types";
import type { FinalExportGateWarning } from "@/lib/final-export-gate";
import type { ProjectExportPackage } from "@/lib/project-export";

export function ReadyExportPanel({
  exportPackage,
  reportMd,
  project,
  warnings = [],
  developmentWatermark,
}: {
  readonly exportPackage: ProjectExportPackage;
  readonly reportMd: string;
  readonly project: DeckProject;
  readonly warnings?: readonly FinalExportGateWarning[];
  readonly developmentWatermark?: "MOCK MODE";
}) {
  const pptxFile =
    exportPackage.pptxExport.kind === "ready" ? exportPackage.pptxExport.file : undefined;
  return (
    <>
      <div className="mb-4 border border-border bg-paper px-4 py-3 text-sm">
        <div className="font-medium">내보내기 파일이 준비되었습니다.</div>
        <div className="mt-1 text-xs text-muted-foreground">
          슬라이드 이미지, 편집 데이터, 보고서를 필요한 형식으로 저장할 수 있습니다.
        </div>
      </div>
      <DevelopmentExportWarning warnings={warnings} watermark={developmentWatermark} />
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => downloadText(`${project.name}_report.md`, reportMd, "text/markdown")}
        >
          보고서 (.md)
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
          프로젝트 파일 (.json)
        </Button>
        {exportPackage.pngFiles.map((file) => (
          <Button key={file.path} variant="outline" onClick={() => downloadDataUrl(file)}>
            PNG {String(file.slideNumber).padStart(2, "0")}
          </Button>
        ))}
        {exportPackage.svgFiles.map((file) => (
          <Button
            key={file.path}
            variant="outline"
            onClick={() => downloadText(file.filename, file.content, file.mime)}
          >
            SVG {String(file.slideNumber).padStart(2, "0")}
          </Button>
        ))}
        {exportPackage.hybridSvgFiles.map((file) => (
          <Button
            key={file.path}
            variant="outline"
            onClick={() => downloadText(file.filename, file.content, file.mime)}
          >
            편집용 SVG {String(file.slideNumber).padStart(2, "0")}
          </Button>
        ))}
        {pptxFile ? (
          <Button variant="outline" onClick={() => downloadDataUrl(pptxFile)}>
            PPTX 파일
          </Button>
        ) : null}
      </div>
    </>
  );
}

function DevelopmentExportWarning({
  warnings,
  watermark,
}: {
  readonly warnings: readonly FinalExportGateWarning[];
  readonly watermark?: "MOCK MODE";
}) {
  if (warnings.length === 0 && watermark === undefined) return null;
  return (
    <div className="mb-4 border border-accent/30 bg-paper px-4 py-3 text-sm">
      <div className="font-medium">개발 검증 참고</div>
      {watermark === undefined ? null : (
        <div className="mt-2 font-mono text-xs font-semibold text-accent">{watermark}</div>
      )}
      <ul className="mt-2 list-disc pl-5 text-muted-foreground">
        {warnings.map((warning) => (
          <li key={`${warning.code}:${warning.artifactId}`}>
            {warning.message}
            {warning.upstreamArtifactIds.length > 0
              ? ` (${warning.upstreamArtifactIds.join(" -> ")} -> ${warning.artifactId})`
              : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlockedExportPanel({
  issues,
}: {
  readonly issues: readonly { readonly code: string; readonly message: string }[];
}) {
  return (
    <div className="border border-destructive/40 bg-paper p-4 text-sm">
      <div className="font-medium">내보내기 전에 확인이 필요합니다.</div>
      <ul className="mt-2 list-disc pl-5 text-muted-foreground">
        {issues.map((issue) => (
          <li key={`${issue.code}:${issue.message}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function ExportDetailsPanel({
  approvals,
  reportMd,
}: {
  readonly approvals: DeckProject["approvalLog"];
  readonly reportMd: string;
}) {
  return (
    <details className="mt-8 border border-border bg-paper p-4">
      <summary className="cursor-pointer text-sm font-medium">세부 기록 보기</summary>
      <ApprovalLog approvals={approvals} />
      <h2 className="mt-8 mb-3 font-serif text-xl">생성 보고서 원문</h2>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap border border-border bg-background p-4 font-mono text-xs leading-relaxed">
        {reportMd}
      </pre>
    </details>
  );
}

export function Metric({
  label,
  value,
  accent,
}: {
  readonly label: string;
  readonly value: string;
  readonly accent?: boolean;
}) {
  return (
    <div className="min-w-0 border border-border bg-paper p-4">
      <div className="break-keep text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 break-keep font-serif text-2xl leading-tight sm:text-3xl ${
          accent ? "text-accent" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ApprovalLog({ approvals }: { readonly approvals: DeckProject["approvalLog"] }) {
  return (
    <>
      <h2 className="mt-6 mb-3 font-serif text-xl">승인 기록</h2>
      <ul className="divide-y divide-border border border-border bg-background text-sm">
        {approvals.map((approval, index) => (
          <li
            key={`${approval.stage}:${index}`}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-medium">{approval.stage}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(approval.at).toLocaleString("ko-KR")}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
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
