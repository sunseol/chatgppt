import { Maximize2 } from "lucide-react";
import { LayoutDraftCanvasPanel } from "@/components/deck/LayoutDraftCanvasPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { DeckProject, LayoutPrototype } from "@/lib/deck-types";

export function LayoutDraftWorkspace({
  layout,
  project,
  revisionSlides,
  selectedSlide,
  selectedLayerId,
  revisionDraft,
  revisionRequests,
  largeSlide,
  onSelectedSlide,
  onSelectedLayer,
  onRevisionDraft,
  onApplyRevision,
  onToggleRevision,
  onLargeSlide,
  onMoveLayer,
}: {
  readonly layout: LayoutPrototype;
  readonly project: DeckProject;
  readonly revisionSlides: readonly number[];
  readonly selectedSlide: number;
  readonly selectedLayerId: string | null;
  readonly revisionDraft: string;
  readonly revisionRequests: Record<number, string>;
  readonly largeSlide: number | null;
  readonly onSelectedSlide: (slideNumber: number) => void;
  readonly onSelectedLayer: (layerId: string) => void;
  readonly onRevisionDraft: (value: string) => void;
  readonly onApplyRevision: () => void;
  readonly onToggleRevision: (slideNumber: number) => void;
  readonly onLargeSlide: (slideNumber: number | null) => void;
  readonly onMoveLayer: (
    slideNumber: number,
    layerId: string,
    delta: { readonly x: number; readonly y: number },
  ) => void;
}) {
  const largeSlideData = layout.slides.find((slide) => slide.number === largeSlide);
  const largeSpec = project.plan?.slides.find((slide) => slide.number === largeSlide);
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-2 gap-5">
          {layout.slides.map((slide) => {
            const spec = project.plan?.slides.find(
              (planSlide) => planSlide.number === slide.number,
            );
            if (!spec || !project.design) return null;
            const requested = revisionSlides.includes(slide.number);
            return (
              <div key={slide.number} className="border border-border bg-paper">
                <LayoutDraftCanvasPanel
                  slide={slide}
                  spec={spec}
                  design={project.design}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={onSelectedLayer}
                  onMoveLayer={onMoveLayer}
                />
                <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
                  <button
                    type="button"
                    className="font-mono text-muted-foreground"
                    onClick={() => onSelectedSlide(slide.number)}
                  >
                    #{String(slide.number).padStart(2, "0")} · {slide.componentType}
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onLargeSlide(slide.number)}
                      className="h-7 px-2 text-[11px]"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      크게 보기
                    </Button>
                    <Button
                      type="button"
                      variant={requested ? "default" : "outline"}
                      size="sm"
                      onClick={() => onToggleRevision(slide.number)}
                      className="h-7 px-2 text-[11px]"
                    >
                      {requested ? "요청됨" : "수정"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <LayoutRevisionPanel
          selectedSlide={selectedSlide}
          revisionDraft={revisionDraft}
          revisionRequests={revisionRequests}
          onRevisionDraft={onRevisionDraft}
          onApplyRevision={onApplyRevision}
        />
      </div>
      <Dialog
        open={largeSlide !== null}
        onOpenChange={(open) => onLargeSlide(open ? largeSlide : null)}
      >
        <DialogContent className="max-w-[min(1200px,calc(100vw-3rem))]">
          <DialogHeader>
            <DialogTitle>레이아웃 크게 보기</DialogTitle>
            <DialogDescription>
              레이어 박스를 드래그해 초안 배치를 조정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {largeSlideData && largeSpec && project.design ? (
            <LayoutDraftCanvasPanel
              slide={largeSlideData}
              spec={largeSpec}
              design={project.design}
              selectedLayerId={selectedLayerId}
              onSelectLayer={onSelectedLayer}
              onMoveLayer={onMoveLayer}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LayoutRevisionPanel({
  selectedSlide,
  revisionDraft,
  revisionRequests,
  onRevisionDraft,
  onApplyRevision,
}: {
  readonly selectedSlide: number;
  readonly revisionDraft: string;
  readonly revisionRequests: Record<number, string>;
  readonly onRevisionDraft: (value: string) => void;
  readonly onApplyRevision: () => void;
}) {
  return (
    <aside className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">수정 요청</div>
      <p className="mt-2 text-sm font-medium">{selectedSlide}번 슬라이드</p>
      <Textarea
        value={revisionDraft}
        onChange={(event) => onRevisionDraft(event.target.value)}
        rows={5}
        placeholder="예: 제목은 더 위로, 차트 영역은 오른쪽 60%까지 넓혀줘"
        className="mt-3"
      />
      <Button
        type="button"
        variant="outline"
        disabled={!revisionDraft.trim()}
        onClick={onApplyRevision}
        className="mt-3 w-full"
      >
        선택 초안에 요청 추가
      </Button>
      <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
        {Object.entries(revisionRequests).map(([slideNumber, request]) => (
          <li key={slideNumber} className="border border-border bg-background p-2">
            {slideNumber}번 · {request}
          </li>
        ))}
      </ul>
    </aside>
  );
}
