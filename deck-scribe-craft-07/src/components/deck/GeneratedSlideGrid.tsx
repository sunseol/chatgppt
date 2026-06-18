import { useState } from "react";
import { Maximize2, Sparkles } from "lucide-react";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { SlidePreviewDialog } from "@/components/deck/SlidePreviewDialog";
import { Button } from "@/components/ui/button";
import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";

export function GeneratedSlideGrid({
  project,
  slides,
}: {
  readonly project: DeckProject;
  readonly slides: readonly GeneratedSlide[];
}) {
  const [largeSlide, setLargeSlide] = useState<number | null>(null);
  const selectedSlide = slides.find((slide) => slide.number === largeSlide);
  const selectedSpec = project.plan?.slides.find((slide) => slide.number === largeSlide);

  return (
    <>
      <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
        {slides.map((slide) => {
          const spec = project.plan?.slides.find((planSlide) => planSlide.number === slide.number);
          if (!spec || !project.design) return null;
          return (
            <div key={slide.number} className="border border-border bg-paper">
              <div className="aspect-video w-full bg-background">
                {slide.status === "generating" ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    <Sparkles className="mr-2 h-3 w-3 animate-pulse" /> 생성 중
                  </div>
                ) : (
                  <SlidePreview design={project.design} spec={spec} slide={slide} mode="image" />
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                <span className="font-mono text-muted-foreground">
                  #{String(slide.number).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">v{slide.version}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLargeSlide(slide.number)}
                    className="h-7 px-2 text-[11px]"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    크게 보기
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <SlidePreviewDialog
        open={largeSlide !== null}
        onOpenChange={(open) => setLargeSlide(open ? largeSlide : null)}
        title="생성 슬라이드 크게 보기"
        description="검토로 넘어가기 전에 생성된 슬라이드를 큰 화면으로 확인합니다."
        design={project.design}
        spec={selectedSpec}
        slide={selectedSlide}
      />
    </>
  );
}
