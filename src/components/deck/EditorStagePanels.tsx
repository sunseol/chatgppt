import { Layers, Maximize2 } from "lucide-react";
import { EditorCanvasPanel } from "@/components/deck/EditorCanvasPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EditableLayerModel } from "@/lib/deck-types";
import type { EditorCanvasRenderModel } from "@/lib/editor-canvas-model";

export function EditorConversionPanel() {
  return (
    <div className="grid min-h-[420px] place-items-center border border-border bg-paper p-8 text-center">
      <div>
        <Layers className="mx-auto h-8 w-8 animate-pulse text-accent" />
        <h2 className="mt-4 font-serif text-2xl">편집 가능한 레이어로 준비 중</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          생성된 슬라이드를 텍스트와 도형 단위로 나누고 있습니다.
        </p>
        <div className="mt-6 h-1 w-72 overflow-hidden bg-secondary">
          <div className="h-full w-2/3 animate-pulse bg-accent" />
        </div>
      </div>
    </div>
  );
}

export function SlideList({
  layers,
  selected,
  onSelect,
}: {
  readonly layers: readonly EditableLayerModel[];
  readonly selected: number;
  readonly onSelect: (slideNumber: number) => void;
}) {
  return (
    <ul className="desktop-scroll space-y-1">
      {layers.map((model) => (
        <li key={model.slideNumber}>
          <button
            type="button"
            onClick={() => onSelect(model.slideNumber)}
            className={`w-full border px-3 py-2 text-left text-xs ${
              selected === model.slideNumber
                ? "border-foreground bg-paper"
                : "border-transparent hover:bg-paper"
            }`}
          >
            <span className="font-mono text-muted-foreground">
              #{String(model.slideNumber).padStart(2, "0")}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LayerList({
  current,
  selectedLayerId,
  onSelectLayer,
}: {
  readonly current: EditableLayerModel | undefined;
  readonly selectedLayerId: string | null;
  readonly onSelectLayer: (layerId: string) => void;
}) {
  return (
    <>
      <div className="mt-5 text-[11px] uppercase tracking-wider text-muted-foreground">레이어</div>
      <ul className="mt-2 space-y-1">
        {current?.layers.map((layer) => (
          <li key={layer.id}>
            <button
              type="button"
              onClick={() => onSelectLayer(layer.id)}
              disabled={!layer.editable}
              className={`flex w-full items-center justify-between border px-3 py-2 text-left text-xs ${
                selectedLayerId === layer.id ? "border-accent bg-paper" : "border-border"
              } ${!layer.editable ? "opacity-40" : "hover:bg-paper"}`}
            >
              <span>{layer.role}</span>
              <span className="font-mono text-muted-foreground">{layer.type}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function EditorStats({
  layerCount,
  textLayerCount,
  performancePassed,
}: {
  readonly layerCount: number;
  readonly textLayerCount: number;
  readonly performancePassed: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <Stat label="레이어" value={String(layerCount)} />
      <Stat label="텍스트" value={String(textLayerCount)} />
      <Stat label="열기" value={performancePassed ? "정상" : "확인"} />
    </div>
  );
}

export function EditorCanvasDialog({
  open,
  model,
  selectedLayerId,
  onOpenChange,
  onSelectLayer,
  onMoveLayer,
  onResizeLayer,
}: {
  readonly open: boolean;
  readonly model: EditorCanvasRenderModel | undefined;
  readonly selectedLayerId: string | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelectLayer: (layerId: string) => void;
  readonly onMoveLayer: (
    layerId: string,
    delta: { readonly x: number; readonly y: number },
  ) => void;
  readonly onResizeLayer: (
    layerId: string,
    delta: { readonly w: number; readonly h: number },
  ) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1280px,calc(100vw-3rem))]">
        <DialogHeader>
          <DialogTitle>큰 화면 편집</DialogTitle>
          <DialogDescription>
            레이어를 선택한 뒤 드래그해서 위치와 크기를 조정합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden border border-border bg-paper">
          {model ? (
            <EditorCanvasPanel
              model={model}
              selectedLayerId={selectedLayerId}
              onSelectLayer={onSelectLayer}
              onMoveLayer={onMoveLayer}
              onResizeLayer={onResizeLayer}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LargeEditButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Maximize2 className="h-4 w-4" />
      크게 편집
    </Button>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-border bg-background px-3 py-2">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
