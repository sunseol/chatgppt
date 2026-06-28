import { RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductionTextWorkflowRunStatus } from "./ProductionTextWorkflowPanel";
import type { CodexStatusActionError } from "@/lib/codex-live-status";

export function RunningControls({
  status,
  onCancel,
}: {
  readonly status: Extract<ProductionTextWorkflowRunStatus, { readonly kind: "running" }>;
  readonly onCancel?: () => void;
}) {
  return (
    <div className="mt-4 border border-border bg-background p-3 text-xs">
      <div className="font-medium">예상 단계</div>
      <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
        {status.expectedSteps.map((step) => (
          <span key={step} className="border border-border px-2 py-1">
            {step}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground">현재: {status.currentStep}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={onCancel === undefined || status.cancelRequested}
        >
          <XCircle className="h-4 w-4" />
          {status.cancelRequested ? "취소 요청됨" : "취소 요청"}
        </Button>
      </div>
    </div>
  );
}

export function FailureControls({
  status,
  onRetry,
}: {
  readonly status: Extract<ProductionTextWorkflowRunStatus, { readonly kind: "failed" }>;
  readonly onRetry?: () => void;
}) {
  const error = status.error ?? fallbackError(status.message);
  return (
    <div className="mt-4 border border-destructive/30 bg-destructive/10 p-3 text-xs">
      <div className="font-medium text-destructive">{error.title}</div>
      <div className="mt-2 text-muted-foreground">원인: {error.cause}</div>
      <div className="mt-1 text-muted-foreground">조치: {error.action}</div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={onRetry}
        disabled={onRetry === undefined}
      >
        <RotateCcw className="h-4 w-4" />
        재시도
        <span className="sr-only">{error.retryLabel}</span>
      </Button>
    </div>
  );
}

function fallbackError(message: string): CodexStatusActionError {
  return {
    title: "Codex 실행에 실패했습니다",
    cause: message,
    action: "연결 및 실행 환경에서 상태를 확인한 뒤 다시 실행하세요.",
    retryLabel: "재시도",
    rawMessage: message,
  };
}
