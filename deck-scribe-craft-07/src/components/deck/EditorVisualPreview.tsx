import type { EditableLayerModel } from "@/lib/deck-types";

export function ConversionLayerPreview() {
  return (
    <div className="w-full max-w-xl border border-border bg-background p-4">
      <div className="grid aspect-video grid-cols-[1fr_88px] gap-4">
        <div className="relative overflow-hidden border border-border bg-paper p-5">
          <div className="h-2 w-14 bg-accent" />
          <div className="mt-5 h-6 w-3/4 animate-pulse bg-foreground/25" />
          <div className="mt-3 h-3 w-full bg-secondary" />
          <div className="mt-2 h-3 w-4/5 bg-secondary" />
          <div className="absolute bottom-5 left-5 right-5 h-20 border border-accent/70 bg-accent/10" />
        </div>
        <div className="flex flex-col justify-between">
          {["title", "message", "visual", "source"].map((layer, index) => (
            <div key={layer} className="border border-border bg-paper p-2">
              <div className={index === 2 ? "h-2 w-10 bg-accent" : "h-2 w-10 bg-foreground/25"} />
              <div className="mt-2 font-mono text-[9px] text-muted-foreground">{layer}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SlideLayerThumbnail({
  model,
  selected,
}: {
  readonly model: EditableLayerModel;
  readonly selected: boolean;
}) {
  const canvas = inferCanvas(model);
  return (
    <div
      className={`relative h-[48px] w-[78px] shrink-0 overflow-hidden border bg-background ${
        selected ? "border-accent" : "border-border"
      }`}
    >
      {model.layers.map((layer) => (
        <span
          key={layer.id}
          className={`absolute border ${
            layer.type === "text"
              ? "border-foreground/25 bg-foreground/10"
              : "border-accent/50 bg-accent/15"
          }`}
          style={{
            left: `${(layer.bounds.x / canvas.w) * 100}%`,
            top: `${(layer.bounds.y / canvas.h) * 100}%`,
            width: `${(layer.bounds.w / canvas.w) * 100}%`,
            height: `${(layer.bounds.h / canvas.h) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

function inferCanvas(model: EditableLayerModel): { readonly w: number; readonly h: number } {
  const maxX = Math.max(...model.layers.map((layer) => layer.bounds.x + layer.bounds.w), 1);
  const maxY = Math.max(...model.layers.map((layer) => layer.bounds.y + layer.bounds.h), 1);
  return { w: maxX, h: maxY };
}
