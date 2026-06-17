import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  SlideRevisionComparison,
  SlideRevisionPreservationCheck,
  SlideRevisionPreservationStatus,
} from "@/lib/slide-revision-generation";
import { hasUnintendedChangeRisk, revisionRiskChecks } from "./revision-compare-model";

export function RevisionComparePanel({
  comparison,
  approveDisabled,
  onApproveRevision,
  onRequestRevision,
}: {
  readonly comparison: SlideRevisionComparison;
  readonly approveDisabled?: boolean;
  readonly onApproveRevision: () => void;
  readonly onRequestRevision: () => void;
}) {
  const hasRisk = hasUnintendedChangeRisk(comparison);
  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <RevisionPreview
          label={`기존 v${comparison.originalSlideVersion}`}
          descriptor={comparison.beforeImageDescriptor}
        />
        <RevisionPreview
          label={`수정본 v${comparison.revisedSlideVersion}`}
          descriptor={comparison.afterImageDescriptor}
        />
      </div>

      {hasRisk ? (
        <div
          role="alert"
          className="flex items-start gap-3 border border-warning/40 bg-warning/10 p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <div className="font-medium">의도치 않은 변경 위험</div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {revisionRiskChecks(comparison).map((check) => (
                <li key={`${check.target}:${check.status}`}>{check.message}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="border border-border bg-paper p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            변경 요약
          </div>
          <p className="mt-2 text-sm">{comparison.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {comparison.requestedChanges.map((change) => (
              <span key={change} className="border border-border bg-background px-2 py-1 text-xs">
                {change}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={onApproveRevision}
            disabled={approveDisabled}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Check className="h-4 w-4" />
            수정본 승인
          </Button>
          <Button type="button" variant="outline" onClick={onRequestRevision}>
            <RefreshCw className="h-4 w-4" />
            재수정 요청
          </Button>
        </div>
      </div>

      <div className="border border-border bg-paper p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">보존 검토</div>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {comparison.preservationChecks.map((check) => (
            <PreservationCheckItem key={check.target} check={check} />
          ))}
        </dl>
      </div>
    </section>
  );
}

function RevisionPreview({
  label,
  descriptor,
}: {
  readonly label: string;
  readonly descriptor: string;
}) {
  return (
    <figure className="border border-border bg-paper">
      <div className="aspect-video w-full bg-background p-4">
        <div className="flex h-full items-center justify-center border border-dashed border-border px-4 text-center font-mono text-xs text-muted-foreground">
          <span className="line-clamp-4 break-all">{descriptor}</span>
        </div>
      </div>
      <figcaption className="border-t border-border px-3 py-2 text-xs font-medium">
        {label}
      </figcaption>
    </figure>
  );
}

function PreservationCheckItem({ check }: { readonly check: SlideRevisionPreservationCheck }) {
  return (
    <div className="border border-border bg-background p-3 text-xs">
      <dt className="flex items-center justify-between gap-2">
        <span className="font-medium">{check.target}</span>
        <span className={statusClass(check.status)}>{statusLabel(check.status)}</span>
      </dt>
      <dd className="mt-2 text-muted-foreground">{check.message}</dd>
    </div>
  );
}

function statusLabel(status: SlideRevisionPreservationStatus): string {
  switch (status) {
    case "kept":
      return "보존";
    case "changed":
      return "변경";
    case "missing":
      return "미확인";
  }
}

function statusClass(status: SlideRevisionPreservationStatus): string {
  switch (status) {
    case "kept":
      return "text-accent";
    case "changed":
      return "text-warning";
    case "missing":
      return "text-destructive";
  }
}
