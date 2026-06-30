import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeckProject } from "@/lib/deck-types";
import type { ProjectExportPackage } from "@/lib/project-export";

export function PptxIdentityChain({
  className = "",
  exportPackage,
  project,
  pptxHash,
}: {
  readonly className?: string;
  readonly exportPackage: ProjectExportPackage;
  readonly project: DeckProject;
  readonly pptxHash: string;
}) {
  const approvedSlides = (project.slides ?? []).filter((slide) => slide.status === "approved");
  const reviewApproval = [...project.approvalLog]
    .reverse()
    .find((entry) => entry.stage === "review");
  const includedCount = exportPackage.pngFiles.length;
  const pptxFilename =
    exportPackage.pptxExport.kind === "ready" ? exportPackage.pptxExport.file.filename : "missing";
  return (
    <section className={`border border-success/40 bg-success/10 p-3 text-xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          검증된 최종 PPTX 패키지
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => copyText(pptxHash)}>
          <Copy className="h-4 w-4" />
          해시 복사
        </Button>
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        승인 덱 identity
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <IdentityField label="PPTX 파일" value={pptxFilename} wide />
        <IdentityField
          label="승인 슬라이드"
          value={`${approvedSlides.length}/${project.slideCount} 승인`}
        />
        <IdentityField label="PPTX 포함" value={`${includedCount}/${project.slideCount} render`} />
      </div>
      <dl className="mt-2 space-y-1 border border-success/40 bg-paper p-2">
        <FullIdentityRow label="Review hash" value={reviewApproval?.hash ?? "missing"} />
        <FullIdentityRow label="Export package" value={exportPackage.artifact.id} />
        <FullIdentityRow label="PPTX fingerprint" value={fingerprint(pptxHash)} />
      </dl>
    </section>
  );
}

function IdentityField({
  label,
  value,
  wide = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 border border-success/30 bg-paper px-2 py-1.5 ${
        wide ? "col-span-3" : ""
      }`}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium" title={value}>
        {value}
      </div>
    </div>
  );
}

function FullIdentityRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[104px_minmax(0,1fr)]">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="break-all font-mono text-[10px] leading-snug">{value}</dd>
    </div>
  );
}

function fingerprint(hash: string): string {
  return hash.startsWith("sha256:") ? hash.slice("sha256:".length) : hash;
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}
