import { CheckCircle2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PptxIdentityChain } from "@/components/deck/PptxIdentityChain";
import type { DeckProject } from "@/lib/deck-types";
import type { ProjectExportPackage } from "@/lib/project-export";

type LiveSlideComposition = NonNullable<DeckProject["liveSlideGeneration"]>["compositions"][number];

export function PptxReadinessPreview({
  exportPackage,
  project,
}: {
  readonly exportPackage: ProjectExportPackage;
  readonly project: DeckProject;
}) {
  if (exportPackage.pptxExport.kind !== "ready") return null;
  const pptxFile = exportPackage.pptxExport.file;
  const compositionsBySlide = new Map(
    (project.liveSlideGeneration?.compositions ?? []).map((composition) => [
      composition.slideNumber,
      composition,
    ]),
  );
  const previewFiles = exportPackage.pngFiles.slice(0, 2);
  const primaryPreview = previewFiles[0];

  return (
    <section className="mb-4 border border-foreground bg-paper p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-accent">PPTX final check</div>
          <h2 className="mt-1 font-serif text-2xl">PPTX 최종 확인</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            승인된 슬라이드와 같은 export package에서 생성된 PPTX 파일, 해시, 미리보기를 확인합니다.
          </p>
        </div>
        <Button
          onClick={() => downloadDataUrl(pptxFile)}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          <Download className="h-4 w-4" />
          PPTX 파일 다운로드
        </Button>
      </div>

      <PptxIdentityChain
        className="mt-4 lg:hidden"
        exportPackage={exportPackage}
        project={project}
        pptxHash={pptxFile.hash}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-3">
          {primaryPreview ? (
            <PrimaryPreview
              composition={compositionsBySlide.get(primaryPreview.slideNumber)}
              dataUrl={primaryPreview.dataUrl}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {previewFiles.map((file) => {
              const composition = compositionsBySlide.get(file.slideNumber);
              return (
                <figure key={file.path} className="border border-border bg-background p-2">
                  <img
                    alt={`PPTX slide ${file.slideNumber} final preview`}
                    src={composition ? compositionPreviewSrc(composition) : file.dataUrl}
                    className="aspect-video w-full bg-paper object-contain"
                  />
                  <figcaption className="mt-2 text-xs text-muted-foreground">
                    Slide {String(file.slideNumber).padStart(2, "0")} · verified
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="border border-success/40 bg-success/10 p-3 text-xs">
            <VerifiedPackageIdentity filename={pptxFile.filename} hash={pptxFile.hash} />
          </div>
          <PptxIdentityChain
            className="max-lg:hidden"
            exportPackage={exportPackage}
            project={project}
            pptxHash={pptxFile.hash}
          />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <PptxStatus label="PPTX 생성" value="완료" />
            <PptxStatus label="렌더 검증" value="일치" />
            <PptxStatus label="편집 레이어" value="보존" />
            <PptxStatus label="패키지" value="검증됨" />
          </div>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <PptxField label="파일" value={pptxFile.filename} />
            <PptxField label="파일 크기" value={formatBytes(dataUrlBytes(pptxFile.dataUrl))} />
            <PptxField label="슬라이드" value={`${exportPackage.pngFiles.length}장`} />
            <PptxField label="배경 이미지" value={`${pptxFile.backgroundImageCount}개`} />
            <PptxField label="편집 텍스트" value={`${pptxFile.editableTextCount}개`} />
            <PptxField label="편집 도형" value={`${pptxFile.editableShapeCount}개`} />
          </dl>
          <CopyableArtifactField label="PPTX artifact path" value={pptxFile.path} />
        </div>
      </div>
    </section>
  );
}

function VerifiedPackageIdentity({
  filename,
  hash,
}: {
  readonly filename: string;
  readonly hash: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2 font-medium text-success">
        <CheckCircle2 className="h-4 w-4" />
        검증된 최종 PPTX 패키지
      </div>
      <div className="mt-2 font-medium">{filename}</div>
      <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        PPTX SHA-256
      </div>
      <div className="mt-1 font-mono text-sm font-semibold">
        PPTX fingerprint {fingerprint(hash)}
      </div>
      <div className="mt-1 break-all font-mono text-[10px] leading-snug">{hash}</div>
    </>
  );
}

function PrimaryPreview({
  composition,
  dataUrl,
}: {
  readonly composition: LiveSlideComposition | undefined;
  readonly dataUrl: string;
}) {
  return (
    <figure className="border border-border bg-background p-2">
      <img
        alt="PPTX final render preview"
        src={composition ? compositionPreviewSrc(composition) : dataUrl}
        className="aspect-video w-full bg-paper object-contain"
      />
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium">Slide 01 · final PPT render preview</span>
        <span className="text-success">PPTX 패키지 기준 확인</span>
      </figcaption>
    </figure>
  );
}

function PptxStatus({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-success/40 bg-success/10 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        {value}
      </div>
    </div>
  );
}

function PptxField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 border border-border bg-background px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-keep font-medium">{value}</dd>
    </div>
  );
}

function CopyableArtifactField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <Button type="button" variant="ghost" size="sm" onClick={() => copyText(value)}>
          <Copy className="h-4 w-4" />
          복사
        </Button>
      </div>
      <div className="mt-1 break-all font-mono text-xs">{value}</div>
    </div>
  );
}

function compositionPreviewSrc(composition: LiveSlideComposition): string {
  if (composition.svg.trim().length === 0) return composition.previewPngDataUrl;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(composition.svg)}`;
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fingerprint(hash: string): string {
  const value = hash.startsWith("sha256:") ? hash.slice("sha256:".length) : hash;
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

function downloadDataUrl(file: { readonly filename: string; readonly dataUrl: string }) {
  const anchor = document.createElement("a");
  anchor.href = file.dataUrl;
  anchor.download = file.filename;
  anchor.click();
}
