import { useState } from "react";
import { Check, FlaskConical, Maximize2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewSlideIdentity } from "@/components/deck/ReviewSlideIdentity";
import type { ReviewGalleryItem } from "@/components/deck/review-gallery-model";
import { PARTIAL_EDIT_EXPERIMENT_LABEL } from "@/components/deck/review-gallery-model";

export function ReviewGalleryPanel(props: {
  readonly items: readonly ReviewGalleryItem[];
  readonly selectedSlideNumber: number | null;
  readonly onSelect: (slideNumber: number) => void;
  readonly onApproveSelected: () => void;
  readonly onApproveAll?: () => void;
  readonly onRegenerateSelected: () => void;
  readonly onDeleteRequest: () => void;
  readonly onAddRequest: () => void;
  readonly canRegenerate: boolean;
  readonly approveAllDisabled?: boolean;
  readonly approveAllLabel?: string;
  readonly showRequestActions?: boolean;
}) {
  const [largeOpen, setLargeOpen] = useState(false);
  const selected = props.items.find((item) => item.slide.number === props.selectedSlideNumber);
  const showRequestActions = props.showRequestActions ?? true;
  const approvedCount = props.items.filter((item) => item.slide.status === "approved").length;
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[260px_1fr] lg:gap-6">
      <section className="order-1 space-y-2 sm:space-y-3 lg:order-2 lg:space-y-4">
        <div className="flex items-center justify-between border border-border bg-paper px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              검토 대상 {approvedCount}/{props.items.length}
            </div>
            <div className="mt-1 text-sm font-medium">{selected?.title ?? "선택 없음"}</div>
            <ReviewSlideIdentity item={selected} />
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
            className="border border-border bg-muted/30 p-0 max-sm:-mx-3 sm:p-2"
          >
            <div className="mb-2 flex items-center justify-between gap-3 px-2 pt-2 text-xs sm:px-1 sm:pt-0">
              <span className="font-medium">선택 슬라이드 실제 크기 검토</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setLargeOpen(true)}>
                <Maximize2 className="h-4 w-4" />
                크게 보기
              </Button>
            </div>
            <img
              alt=""
              src={compositionPreviewSrc(selected.composition)}
              className="aspect-video w-full bg-paper object-contain"
            />
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            onClick={props.onApproveSelected}
            disabled={!selected}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Check className="h-4 w-4" />이 슬라이드 검토 완료
          </Button>
          {showRequestActions ? (
            <>
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
            </>
          ) : null}
        </div>
      </section>
      <section className="order-2 self-start lg:order-1">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">전체 슬라이드 검토 현황</span>
          <span className="text-muted-foreground">
            {approvedCount}/{props.items.length} 승인
          </span>
        </div>
        <ApproveAllPanel
          className="mb-3 hidden lg:block"
          onApproveAll={props.onApproveAll}
          approveAllDisabled={props.approveAllDisabled}
          approveAllLabel={props.approveAllLabel}
        />
        <ul className="max-h-40 space-y-1 overflow-y-auto sm:max-h-[34vh] lg:max-h-64">
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
        <ApproveAllPanel
          className="mt-3 lg:hidden"
          onApproveAll={props.onApproveAll}
          approveAllDisabled={props.approveAllDisabled}
          approveAllLabel={props.approveAllLabel}
        />
      </section>
      <Dialog open={largeOpen} onOpenChange={setLargeOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl">
          <DialogHeader>
            <DialogTitle>{selected?.title ?? "슬라이드 크게 보기"}</DialogTitle>
            <DialogDescription>
              최종 승인 전 슬라이드 텍스트와 차트를 크게 확인합니다.
            </DialogDescription>
          </DialogHeader>
          {selected?.composition ? (
            <img
              alt=""
              src={compositionPreviewSrc(selected.composition)}
              className="aspect-video w-full bg-paper object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApproveAllPanel({
  approveAllDisabled,
  approveAllLabel,
  className,
  onApproveAll,
}: {
  readonly approveAllDisabled?: boolean;
  readonly approveAllLabel?: string;
  readonly className: string;
  readonly onApproveAll?: () => void;
}) {
  if (!onApproveAll) return null;
  return (
    <section className={`border border-border bg-paper p-3 ${className}`}>
      <div className="text-xs font-medium">모든 슬라이드 확인 후 다음 단계로 이동</div>
      <p className="mt-1 text-xs text-muted-foreground">
        전체 덱을 확인했다면 편집 가능한 PPT 레이어 단계로 진행합니다.
      </p>
      <Button
        className="mt-3 w-full bg-foreground text-background hover:bg-foreground/90"
        onClick={onApproveAll}
        disabled={approveAllDisabled}
      >
        <Check className="h-4 w-4" />
        {approveAllLabel ?? "전체 검토 완료하고 편집 시작"}
      </Button>
    </section>
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
