import { AlertTriangle, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkflowErrorRecord } from "@/lib/workflow-error-types";

export function ActionableErrorPanel({
  error,
  onRetry,
}: {
  readonly error: WorkflowErrorRecord;
  readonly onRetry?: () => void;
}) {
  return (
    <section
      role="alert"
      className="mb-6 border border-destructive/40 bg-destructive/10 p-4 text-sm"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-destructive">작업 오류</div>
          <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <Field label="오류 단계" value={error.stage} />
            <Field label="오류 유형" value={kindLabel(error.kind)} />
            <Field label="재시도" value={error.retryable ? "재시도 가능" : "재시도 불가"} />
            <Field label="최종 승인" value={error.blocksFinalApproval ? "차단됨" : "차단 없음"} />
          </dl>
          <div className="mt-3 text-xs">
            <div className="font-medium">원인</div>
            <div className="mt-1 text-muted-foreground">{error.cause}</div>
          </div>
          <div className="mt-3 text-xs">
            <div className="font-medium">복구 액션</div>
            <div className="mt-1 text-muted-foreground">{error.recoveryAction}</div>
          </div>
          {error.draftRecovery ? (
            <div className="mt-3 flex items-start gap-2 border border-border bg-background/60 p-3 text-xs">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <div>
                <div className="font-medium">임시 복구본</div>
                <div className="mt-1 text-muted-foreground">
                  {error.draftRecovery.label} ·{" "}
                  {new Date(error.draftRecovery.createdAt).toLocaleString("ko-KR")}
                </div>
              </div>
            </div>
          ) : null}
          {error.retryable && onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry} className="mt-4">
              <RotateCcw className="h-4 w-4" />
              다시 시도
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}

function kindLabel(kind: WorkflowErrorRecord["kind"]): string {
  switch (kind) {
    case "provider":
      return "provider";
    case "render":
      return "render";
    case "save":
      return "save";
    case "transform":
      return "transform";
    default:
      return assertNever(kind);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected workflow error panel kind: ${String(value)}`);
}
