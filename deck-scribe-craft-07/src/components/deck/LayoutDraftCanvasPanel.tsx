import { useRef, type PointerEvent } from "react";
import { SlidePreview } from "@/components/deck/SlidePreview";
import type { DesignSystem, LayoutPrototype, SlideSpec } from "@/lib/deck-types";

type LayoutSlide = LayoutPrototype["slides"][number];
type DomLayer = LayoutSlide["domLayers"][number];

type DragState = {
  readonly layerId: string;
  readonly startX: number;
  readonly startY: number;
};

export function LayoutDraftCanvasPanel({
  slide,
  spec,
  design,
  selectedLayerId,
  onSelectLayer,
  onMoveLayer,
}: {
  readonly slide: LayoutSlide;
  readonly spec: SlideSpec;
  readonly design: DesignSystem;
  readonly selectedLayerId: string | null;
  readonly onSelectLayer: (layerId: string) => void;
  readonly onMoveLayer: (
    slideNumber: number,
    layerId: string,
    delta: { readonly x: number; readonly y: number },
  ) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = (layer: DomLayer, event: PointerEvent<HTMLButtonElement>) => {
    if (!layer.editable) return;
    dragRef.current = { layerId: layer.id, startX: event.clientX, startY: event.clientY };
    onSelectLayer(layer.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const state = dragRef.current;
    dragRef.current = null;
    if (!state) return;
    const delta = pointerDeltaToCanvasDelta(
      event.clientX - state.startX,
      event.clientY - state.startY,
      rootRef.current,
      design,
    );
    if (delta.x === 0 && delta.y === 0) return;
    onMoveLayer(slide.number, state.layerId, delta);
  };

  return (
    <div
      ref={rootRef}
      className="relative aspect-video w-full overflow-hidden bg-background"
      data-layout-draft={slide.number}
    >
      {slide.layoutPngDataUrl ? (
        <img
          src={slide.layoutPngDataUrl}
          alt={`${slide.number}번 레이아웃 초안`}
          className="h-full w-full object-cover"
        />
      ) : (
        <SlidePreview
          design={design}
          spec={spec}
          slide={{ number: slide.number, version: 1, status: "ready", imageDescriptor: "" }}
          mode="layout"
        />
      )}
      {slide.domLayers.map((layer) => (
        <button
          key={layer.id}
          type="button"
          disabled={!layer.editable}
          onClick={() => onSelectLayer(layer.id)}
          onPointerDown={(event) => startDrag(layer, event)}
          onPointerUp={finishDrag}
          className={layerClassName(layer, selectedLayerId === layer.id)}
          style={boundsToStyle(layer.bounds, design)}
          title={`${layer.role} div`}
        >
          <span className="truncate">div · {layer.role}</span>
        </button>
      ))}
    </div>
  );
}

function layerClassName(layer: DomLayer, selected: boolean): string {
  const base =
    "absolute box-border flex items-center border px-2 text-left text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const state = selected
    ? "border-accent bg-accent/15 text-foreground"
    : "border-foreground/30 bg-background/70 text-foreground/80";
  const enabled = layer.editable
    ? "cursor-grab hover:border-accent"
    : "cursor-not-allowed opacity-50";
  return [base, state, enabled].join(" ");
}

function boundsToStyle(bounds: DomLayer["bounds"], design: DesignSystem) {
  return {
    left: percent(bounds.x, design.canvas.w),
    top: percent(bounds.y, design.canvas.h),
    width: percent(bounds.w, design.canvas.w),
    height: percent(bounds.h, design.canvas.h),
  };
}

function pointerDeltaToCanvasDelta(
  clientDeltaX: number,
  clientDeltaY: number,
  root: HTMLDivElement | null,
  design: DesignSystem,
): { readonly x: number; readonly y: number } {
  const rect = root?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  return {
    x: Math.round(clientDeltaX * (design.canvas.w / rect.width)),
    y: Math.round(clientDeltaY * (design.canvas.h / rect.height)),
  };
}

function percent(value: number, total: number): string {
  if (total <= 0) return "0.00%";
  return `${((value / total) * 100).toFixed(2)}%`;
}
