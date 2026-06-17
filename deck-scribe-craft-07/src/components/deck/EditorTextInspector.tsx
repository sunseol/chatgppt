import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EditableLayerModel } from "@/lib/deck-types";

export function EditorTextInspector({
  layer,
  exportHash,
  onTextChange,
}: {
  readonly layer: EditableLayerModel["layers"][number] | undefined;
  readonly exportHash: string;
  readonly onTextChange: (layerId: string, text: string) => void;
}) {
  if (!layer || layer.type !== "text" || !layer.editable) return null;
  return (
    <div className="mt-4">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        텍스트 편집
      </Label>
      <Textarea
        value={layer.text ?? ""}
        onChange={(event) => onTextChange(layer.id, event.target.value)}
        rows={4}
        className="mt-2"
      />
      <div className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{exportHash}</div>
    </div>
  );
}
