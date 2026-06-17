import type { LayoutValidationReport } from "@/lib/layout-validation";
import { formatLayoutMetric } from "./layout-approval-model";

export function LayoutValidationPanel({
  report,
}: {
  readonly report: LayoutValidationReport | undefined;
}) {
  if (!report) {
    return (
      <div className="mb-6 border border-warning/40 bg-warning/10 p-4 text-sm">
        <div className="font-medium">검증 대기</div>
      </div>
    );
  }
  const passed = report.status === "passed";
  return (
    <div className="mb-6 border border-border bg-paper p-4 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="font-medium">{passed ? "검증 통과" : "검증 실패"}</div>
        <div className="font-mono text-xs text-muted-foreground">
          {report.summary.renderedSlideCount}/{report.summary.slideCount}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <Metric label="렌더링" value={formatLayoutMetric(report.summary.renderSuccessRate)} />
        <Metric label="Overflow" value={formatLayoutMetric(report.summary.overflowSlideRate)} />
        <Metric
          label="Safe margin"
          value={formatLayoutMetric(report.summary.safeMarginBreachRate)}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-border/70 px-3 py-2">
      <span>{label}</span> <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
