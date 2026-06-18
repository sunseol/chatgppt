import { AlertTriangle, CheckCircle2, Clock, FileText, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProviderJob } from "@/lib/provider-job-manager";
import { createProviderJobProgressView } from "@/lib/provider-job-progress-view";

export function ProviderJobProgressPanel({
  stageLabel,
  job,
  recovered,
  onCancel,
  onRetry,
}: {
  readonly stageLabel: string;
  readonly job: ProviderJob;
  readonly recovered: boolean;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
}) {
  const view = createProviderJobProgressView({ stageLabel, job, recovered });
  return (
    <section className="mb-6 border border-border bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">현재 단계</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium">
            <StatusIcon status={view.status} />
            <span>{view.stageLabel}</span>
            <span className="text-muted-foreground">{view.statusLabel}</span>
            {view.recovered ? <span className="text-accent">재시작 복구됨</span> : null}
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground" title={view.jobId}>
          <div>진행 상태</div>
          <div className="mt-1 text-foreground">{view.attemptLabel}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden bg-secondary">
          <div className="h-full bg-accent transition-all" style={{ width: `${view.percent}%` }} />
        </div>
        <div className="w-12 text-right font-mono text-xs text-muted-foreground">
          {view.percent}%
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{view.message}</div>

      <dl className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <dt>제공자</dt>
          <dd className="mt-1 font-mono text-foreground">{view.providerLabel}</dd>
        </div>
        <div>
          <dt>실행 시간</dt>
          <dd className="mt-1 font-mono text-foreground">{view.durationLabel}</dd>
        </div>
        <div>
          <dt>Retry</dt>
          <dd className="mt-1 font-mono text-foreground">{view.retryLabel}</dd>
        </div>
      </dl>

      {view.usageItems.length > 0 ? (
        <div className="mt-4">
          <div className="text-xs font-medium">사용량</div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {view.usageItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.failureSummary ? (
        <div className="mt-4 flex items-start gap-2 border border-destructive/30 bg-destructive/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <div>
            <div className="font-medium text-destructive">실패 요약</div>
            <div className="mt-1 text-muted-foreground">{view.failureSummary}</div>
          </div>
        </div>
      ) : null}

      {view.artifacts.length > 0 ? (
        <div className="mt-4">
          <div className="text-xs font-medium">중간 산출물</div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {view.artifacts.map((artifact) => (
              <li
                key={`${artifact.label}:${artifact.artifactId ?? "partial"}`}
                className="flex gap-2"
              >
                <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{artifact.label}</span>
                {artifact.artifactId ? (
                  <span className="font-mono">{artifact.artifactId}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {view.canCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            <XCircle className="h-4 w-4" />
            취소 요청
          </Button>
        ) : null}
        {view.canRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
            재시도
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function StatusIcon({ status }: { readonly status: ProviderJob["status"] }) {
  switch (status) {
    case "queued":
    case "running":
      return <Clock className="h-4 w-4 text-accent" />;
    case "succeeded":
      return <CheckCircle2 className="h-4 w-4 text-accent" />;
    case "failed":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected provider job panel status: ${String(value)}`);
}
