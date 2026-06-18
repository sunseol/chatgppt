import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { EditableReviewGateReport } from "@/lib/editable-review-gate";

export function EditableReviewGatePanel({ report }: { readonly report: EditableReviewGateReport }) {
  const blocked = report.status === "blocked";
  const StatusIcon = blocked ? AlertTriangle : CheckCircle2;

  return (
    <section
      data-editable-review-gate={report.status}
      className="mb-6 border border-border bg-paper p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${blocked ? "text-destructive" : "text-accent"}`} />
          <div>
            <div className="text-sm font-medium">편집 가능성 검증</div>
            <div className="text-xs text-muted-foreground">
              {blocked ? "레이어를 보완해야 승인할 수 있음" : "승인 가능"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right text-xs">
          <Metric label="Slides" value={String(report.slideCount)} />
          <Metric label="Editable" value={`${report.editableLayers}/${report.totalLayers}`} />
          <Metric label="Ratio" value={`${report.editableRatio}%`} />
        </div>
      </div>
      {report.failures.length > 0 ? (
        <ul className="mt-4 space-y-2 text-xs text-destructive">
          {report.failures.map((failure) => (
            <li
              key={`${failure.code}-${failure.slideNumber ?? "deck"}`}
              data-editable-gate-failure={failure.code}
              className="border border-destructive/30 bg-destructive/5 px-3 py-2"
            >
              {failure.message}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          모든 슬라이드에 편집 가능한 레이어가 있습니다.
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}
