import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DesignSystem } from "@/lib/deck-types";
import {
  DESIGN_COLOR_KEYS,
  DESIGN_TYPOGRAPHY_KEYS,
  parseNegativeRuleText,
  updateDesignColor,
  updateDesignNegativeRules,
  updateDesignTypographyRule,
} from "@/lib/design-editor-model";

export function DesignSystemEditorPanel({
  design,
  dirty,
  disabled,
  onChange,
  onSave,
}: {
  readonly design: DesignSystem;
  readonly dirty: boolean;
  readonly disabled: boolean;
  readonly onChange: (design: DesignSystem) => void;
  readonly onSave: () => void;
}) {
  return (
    <section className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Token Editor</div>
      <ColorEditor design={design} disabled={disabled} onChange={onChange} />
      <TypographyEditor design={design} disabled={disabled} onChange={onChange} />
      <NegativeRulesEditor design={design} disabled={disabled} onChange={onChange} />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || !dirty}
        onClick={onSave}
        className="mt-4 w-full"
      >
        <Save className="h-4 w-4" />
        디자인 수정 저장
      </Button>
    </section>
  );
}

function ColorEditor({
  design,
  disabled,
  onChange,
}: {
  readonly design: DesignSystem;
  readonly disabled: boolean;
  readonly onChange: (design: DesignSystem) => void;
}) {
  return (
    <div className="mt-4">
      <div className="text-xs font-medium">Color Tokens</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {DESIGN_COLOR_KEYS.map((key) => (
          <Label key={key} className="grid gap-1 text-xs">
            <span className="text-muted-foreground">{key}</span>
            <div className="grid grid-cols-[36px_1fr] gap-2">
              <Input
                type="color"
                value={design.colors[key]}
                disabled={disabled}
                onChange={(event) => onChange(updateDesignColor(design, key, event.target.value))}
                className="h-9 p-1"
              />
              <Input
                value={design.colors[key]}
                disabled={disabled}
                onChange={(event) => onChange(updateDesignColor(design, key, event.target.value))}
                className="font-mono text-xs"
              />
            </div>
          </Label>
        ))}
      </div>
    </div>
  );
}

function TypographyEditor({
  design,
  disabled,
  onChange,
}: {
  readonly design: DesignSystem;
  readonly disabled: boolean;
  readonly onChange: (design: DesignSystem) => void;
}) {
  return (
    <div className="mt-5">
      <div className="text-xs font-medium">Typography</div>
      <div className="mt-2 space-y-2">
        {DESIGN_TYPOGRAPHY_KEYS.map((key) => (
          <div key={key} className="grid grid-cols-[72px_1fr_1fr] items-end gap-2">
            <div className="pb-2 text-xs text-muted-foreground">{key}</div>
            <NumberField
              label="min"
              value={design.typography[key].minPx}
              disabled={disabled}
              onChange={(value) =>
                onChange(updateDesignTypographyRule(design, key, "minPx", value))
              }
            />
            <NumberField
              label="max"
              value={design.typography[key].maxPx}
              disabled={disabled}
              onChange={(value) =>
                onChange(updateDesignTypographyRule(design, key, "maxPx", value))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly disabled: boolean;
  readonly onChange: (value: number) => void;
}) {
  return (
    <Label className="grid gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="text-xs"
      />
    </Label>
  );
}

function NegativeRulesEditor({
  design,
  disabled,
  onChange,
}: {
  readonly design: DesignSystem;
  readonly disabled: boolean;
  readonly onChange: (design: DesignSystem) => void;
}) {
  return (
    <div className="mt-5">
      <Label className="text-xs font-medium">Negative Rules</Label>
      <Textarea
        value={design.negativeRules.join("\n")}
        disabled={disabled}
        onChange={(event) =>
          onChange(updateDesignNegativeRules(design, parseNegativeRuleText(event.target.value)))
        }
        rows={5}
        className="mt-2 font-mono text-xs"
      />
    </div>
  );
}
