import { useRef, type PointerEvent } from "react";
import type { EditorCanvasLayerNode, EditorCanvasRenderModel } from "@/lib/editor-canvas-model";

interface DragState {
  readonly kind: "move" | "resize";
  readonly layerId: string;
  readonly startX: number;
  readonly startY: number;
}

export function EditorCanvasPanel({
  model,
  selectedLayerId,
  onSelectLayer,
  onMoveLayer,
  onResizeLayer,
}: {
  readonly model: EditorCanvasRenderModel;
  readonly selectedLayerId: string | null;
  readonly onSelectLayer: (layerId: string) => void;
  readonly onMoveLayer?: (
    layerId: string,
    delta: { readonly x: number; readonly y: number },
  ) => void;
  readonly onResizeLayer?: (
    layerId: string,
    delta: { readonly w: number; readonly h: number },
  ) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = (
    kind: DragState["kind"],
    layer: EditorCanvasLayerNode,
    event: PointerEvent<HTMLElement>,
  ) => {
    if (layer.locked) return;
    dragRef.current = { kind, layerId: layer.id, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    const state = dragRef.current;
    dragRef.current = null;
    if (!state) return;
    const delta = pointerDeltaToCanvasDelta(
      event.clientX - state.startX,
      event.clientY - state.startY,
      rootRef.current,
      model,
    );
    if (delta.x === 0 && delta.y === 0) return;
    if (state.kind === "move") {
      onMoveLayer?.(state.layerId, delta);
      return;
    }
    onResizeLayer?.(state.layerId, { w: delta.x, h: delta.y });
  };

  return (
    <div
      ref={rootRef}
      data-editor-canvas={model.slideNumber}
      className="relative w-full max-w-[calc(100vw-3rem)] overflow-hidden bg-background xl:max-w-none"
      style={{ aspectRatio: `${model.canvas.width} / ${model.canvas.height}` }}
    >
      {model.layers.map((layer) => (
        <CanvasLayerNode
          key={layer.id}
          layer={layer}
          selected={selectedLayerId === layer.id}
          onSelectLayer={onSelectLayer}
          onStartDrag={startDrag}
          onFinishDrag={finishDrag}
        />
      ))}
    </div>
  );
}

function CanvasLayerNode({
  layer,
  selected,
  onSelectLayer,
  onStartDrag,
  onFinishDrag,
}: {
  readonly layer: EditorCanvasLayerNode;
  readonly selected: boolean;
  readonly onSelectLayer: (layerId: string) => void;
  readonly onStartDrag: (
    kind: DragState["kind"],
    layer: EditorCanvasLayerNode,
    event: PointerEvent<HTMLElement>,
  ) => void;
  readonly onFinishDrag: (event: PointerEvent<HTMLElement>) => void;
}) {
  return (
    <button
      type="button"
      data-canvas-layer={layer.id}
      data-layer-type={layer.type}
      data-role={layer.role}
      data-locked={String(layer.locked)}
      aria-label={layer.ariaLabel}
      disabled={layer.locked}
      onClick={() => onSelectLayer(layer.id)}
      onPointerDown={(event) => onStartDrag("move", layer, event)}
      onPointerUp={onFinishDrag}
      className={layerClassName(layer, selected)}
      style={{
        left: layer.style.left,
        top: layer.style.top,
        width: layer.style.width,
        height: layer.style.height,
        zIndex: layer.zIndex,
      }}
    >
      {renderLayerContent(layer)}
      {selected && !layer.locked && (
        <span
          data-resize-handle={layer.id}
          onPointerDown={(event) => {
            event.stopPropagation();
            onStartDrag("resize", layer, event);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            onFinishDrag(event);
          }}
          className="absolute bottom-0 right-0 h-3 w-3 border-l border-t border-accent bg-background"
        />
      )}
    </button>
  );
}

function renderLayerContent(layer: EditorCanvasLayerNode) {
  if (layer.type === "text") {
    return <span className="block truncate text-left">{layer.text ?? ""}</span>;
  }
  if (layer.type === "chart") {
    return <span className="font-mono text-[10px] uppercase tracking-wider">chart</span>;
  }
  if (layer.type === "image") {
    return <span className="font-mono text-[10px] uppercase tracking-wider">image</span>;
  }
  return <span className="sr-only">{layer.role}</span>;
}

function layerClassName(layer: EditorCanvasLayerNode, selected: boolean): string {
  const base =
    "absolute box-border overflow-hidden border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const state = selected
    ? "border-accent bg-accent/10 text-foreground"
    : "border-foreground/15 bg-paper/65 text-foreground/80";
  const locked = layer.locked ? "cursor-default opacity-80" : "cursor-pointer hover:border-accent";
  const shape = layer.type === "shape" ? "bg-muted/30" : "";
  const chart = layer.type === "chart" ? "grid place-items-center bg-success/10" : "";
  const image = layer.type === "image" ? "grid place-items-center bg-primary/10" : "";
  const text = layer.type === "text" ? "px-3 py-2 leading-snug" : "";
  return [base, state, locked, shape, chart, image, text].filter(Boolean).join(" ");
}

function pointerDeltaToCanvasDelta(
  clientDeltaX: number,
  clientDeltaY: number,
  root: HTMLDivElement | null,
  model: EditorCanvasRenderModel,
): { readonly x: number; readonly y: number } {
  const rect = root?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  return {
    x: Math.round(clientDeltaX * (model.canvas.width / rect.width)),
    y: Math.round(clientDeltaY * (model.canvas.height / rect.height)),
  };
}
