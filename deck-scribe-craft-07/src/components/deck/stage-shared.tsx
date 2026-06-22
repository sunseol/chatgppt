import { AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function StageShell({ children }: { readonly children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>;
}

export function StageScroll({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={`desktop-scroll w-full flex-1 pb-28 pt-8 ${className ?? ""}`}>{children}</div>
  );
}

export function StageHeader({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <header className="mb-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
        {num} · {sub}
      </div>
      <h1 className="mt-2 font-serif text-3xl tracking-tight xl:text-4xl">{title}</h1>
    </header>
  );
}

export function InvalidatedBanner({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="mb-6 flex items-start gap-3 border border-warning/40 bg-warning/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>
        <div className="font-medium">상위 단계가 변경되어 이 단계는 재승인이 필요합니다.</div>
        <div className="mt-1 text-xs text-muted-foreground">
          앞 단계의 내용이 바뀌었습니다. 이 단계 결과를 다시 확인한 뒤 승인해주세요.
        </div>
      </div>
    </div>
  );
}

export function StageErrorBanner({
  title,
  message,
}: {
  readonly title: string;
  readonly message: string;
}) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 border border-destructive/40 bg-destructive/10 p-4 text-sm"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <div className="font-medium text-destructive">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}

export function EmptyAction({
  label,
  onClick,
  busy,
  disabled = false,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly busy: boolean;
  readonly disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-border bg-paper py-16">
      <Sparkles className="h-8 w-8 text-accent" />
      <div className="text-sm text-muted-foreground">{label}</div>
      <Button
        onClick={onClick}
        disabled={busy || disabled}
        className="bg-foreground text-background hover:bg-foreground/90"
      >
        {busy ? "생성 중..." : "초안 생성"}
      </Button>
    </div>
  );
}
