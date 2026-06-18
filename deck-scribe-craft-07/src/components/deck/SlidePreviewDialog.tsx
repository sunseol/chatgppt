import { SlidePreview } from "@/components/deck/SlidePreview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DesignSystem, GeneratedSlide, SlideSpec } from "@/lib/deck-types";

export function SlidePreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  design,
  spec,
  slide,
  mode = "image",
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly design: DesignSystem | undefined;
  readonly spec: SlideSpec | undefined;
  readonly slide: GeneratedSlide | undefined;
  readonly mode?: "layout" | "image" | "layers";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1200px,calc(100vw-3rem))]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="aspect-video overflow-hidden border border-border bg-background">
          {design && spec && slide ? (
            <SlidePreview design={design} spec={spec} slide={slide} mode={mode} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
