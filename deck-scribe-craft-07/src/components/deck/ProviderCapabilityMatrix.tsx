import { CheckCircle2, LockKeyhole, Wrench } from "lucide-react";
import type {
  ProviderCapabilityMatrixView,
  ProviderCapabilityRowStatus,
} from "@/lib/provider-capability-view";

export function ProviderCapabilityMatrix({
  view,
}: {
  readonly view: ProviderCapabilityMatrixView;
}) {
  return (
    <section className="border border-border bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Provider 기능 매트릭스
          </div>
          <div className="mt-1 text-sm font-medium">{view.providerName}</div>
        </div>
        <div className="max-w-sm text-right text-xs text-muted-foreground">
          {view.providerStatusMessage}
        </div>
      </div>

      <div className="mt-4 divide-y divide-border border border-border">
        {view.rows.map((row) => (
          <div
            key={row.key}
            className="grid gap-3 px-3 py-3 text-sm md:grid-cols-[140px_96px_1fr_160px]"
          >
            <div className="flex items-center gap-2 font-medium">
              <CapabilityStatusIcon status={row.status} />
              <span>{row.label}</span>
            </div>
            <div className={row.status === "available" ? "text-accent" : "text-warning"}>
              {row.stateLabel}
            </div>
            <div className="text-muted-foreground">{row.reason}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wrench className="h-3.5 w-3.5 shrink-0" />
              <span>{row.actionLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CapabilityStatusIcon({ status }: { readonly status: ProviderCapabilityRowStatus }) {
  switch (status) {
    case "available":
      return <CheckCircle2 className="h-4 w-4 text-accent" />;
    case "locked":
      return <LockKeyhole className="h-4 w-4 text-warning" />;
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected provider capability status: ${String(value)}`);
}
