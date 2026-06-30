import { Button } from "@/components/ui/button";
import { ChevronLeft, RefreshCw, Check } from "lucide-react";

export function GateBar(props: {
  back?: { label: string; onClick: () => void };
  regenerate?: { label: string; onClick: () => void };
  approve?: { label: string; onClick: () => void; disabled?: boolean };
  hint?: string;
  mobileHidden?: boolean;
}) {
  const { back, regenerate, approve, hint, mobileHidden } = props;
  return (
    <div
      className={`z-20 shrink-0 border-t border-border bg-background/95 backdrop-blur ${
        mobileHidden ? "max-sm:hidden" : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:gap-4 sm:px-8 sm:py-4">
        <div className="min-w-0 text-xs leading-relaxed text-muted-foreground max-sm:hidden">
          {hint}
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {back && (
            <Button variant="ghost" size="sm" onClick={back.onClick}>
              <ChevronLeft className="h-4 w-4" />
              {back.label}
            </Button>
          )}
          {regenerate && (
            <Button variant="outline" size="sm" onClick={regenerate.onClick}>
              <RefreshCw className="h-4 w-4" />
              {regenerate.label}
            </Button>
          )}
          {approve && (
            <Button
              size="sm"
              onClick={approve.onClick}
              disabled={approve.disabled}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <Check className="h-4 w-4" />
              {approve.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
