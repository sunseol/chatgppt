import { Check, FlaskConical, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReviewGalleryItem } from "@/components/deck/review-gallery-model";
import { PARTIAL_EDIT_EXPERIMENT_LABEL } from "@/components/deck/review-gallery-model";

export function ReviewGalleryPanel(props: {
  readonly items: readonly ReviewGalleryItem[];
  readonly selectedSlideNumber: number | null;
  readonly onSelect: (slideNumber: number) => void;
  readonly onApproveSelected: () => void;
  readonly onRegenerateSelected: () => void;
  readonly onDeleteRequest: () => void;
  readonly onAddRequest: () => void;
  readonly canRegenerate: boolean;
}) {
  const selected = props.items.find((item) => item.slide.number === props.selectedSlideNumber);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr] lg:gap-6">
      <ul className="max-h-[45vh] space-y-1 overflow-y-auto lg:max-h-[70vh]">
        {props.items.map((item) => (
          <li key={item.slide.number}>
            <button
              onClick={() => props.onSelect(item.slide.number)}
              className={`flex w-full items-center gap-3 border px-3 py-2 text-left text-xs ${
                item.selected ? "border-foreground bg-paper" : "border-transparent hover:bg-paper"
              }`}
            >
              {item.composition && (
                <img
                  alt=""
                  data-compositor-thumbnail={item.slide.number}
                  data-export-basis={item.composition.exportBasis}
                  data-background-artifact-path={item.composition.backgroundArtifact?.path}
                  src={compositionPreviewSrc(item.composition)}
                  className="h-10 aspect-video shrink-0 border border-border object-cover"
                />
              )}
              <span className="font-mono text-muted-foreground">
                {String(item.slide.number).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate">{item.title}</span>
              <ReviewBadge item={item} />
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-4">
        <div className="flex items-center justify-between border border-border bg-paper px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              선택 슬라이드
            </div>
            <div className="mt-1 text-sm font-medium">{selected?.title ?? "선택 없음"}</div>
          </div>
          {selected?.qaStatus === "failed" && (
            <span className="text-xs font-medium text-destructive">검증 실패</span>
          )}
        </div>
        {selected?.composition && (
          <div
            data-selected-composition={selected.slide.number}
            data-presentation-preview={selected.slide.number}
            data-export-basis={selected.composition.exportBasis}
            data-background-artifact-path={selected.composition.backgroundArtifact?.path}
            className="border border-border bg-muted/30 p-2"
          >
            <img
              alt=""
              src={compositionPreviewSrc(selected.composition)}
              className="aspect-video w-full object-cover"
            />
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={props.onApproveSelected} disabled={!selected}>
            <Check className="h-4 w-4" />
            선택 슬라이드 승인
          </Button>
          <Button
            variant="outline"
            onClick={props.onRegenerateSelected}
            disabled={!selected || !props.canRegenerate}
          >
            <RefreshCw className="h-4 w-4" />
            선택 슬라이드 재생성
          </Button>
          <Button variant="outline" onClick={props.onDeleteRequest} disabled={!selected}>
            <Trash2 className="h-4 w-4" />
            삭제 요청
          </Button>
          <Button variant="outline" onClick={props.onAddRequest}>
            <Plus className="h-4 w-4" />
            추가 요청
          </Button>
          <Button variant="outline" disabled className="sm:col-span-2">
            <FlaskConical className="h-4 w-4" />
            {PARTIAL_EDIT_EXPERIMENT_LABEL}
          </Button>
        </div>
      </div>
    </div>
  );
}

function compositionPreviewSrc(composition: ReviewGalleryItem["composition"]): string | undefined {
  if (composition === undefined) return undefined;
  if (composition.svg.trim().length === 0) return composition.previewPngDataUrl;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(composition.svg)}`;
}

function ReviewBadge({ item }: { readonly item: ReviewGalleryItem }) {
  if (item.qaStatus === "failed") {
    return <span className="text-destructive">검증 실패</span>;
  }
  if (item.slide.status === "approved") {
    return <span className="text-accent">승인됨</span>;
  }
  return <span className="text-muted-foreground">대기</span>;
}
