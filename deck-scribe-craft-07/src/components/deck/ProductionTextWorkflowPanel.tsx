import { Loader2, Play, Settings } from "lucide-react";
import { FailureControls, RunningControls } from "./ProductionTextWorkflowPanelControls";
import { Button } from "@/components/ui/button";
import { createCodexLiveStatusView, type CodexWorkflowRunStatus } from "@/lib/codex-live-status";
import {
  createProductionTextWorkflowGate,
  type ProductionTextWorkflowBridgeStatus,
  type ProductionTextWorkflowGate,
  type ProductionTextWorkflowStage,
  type ProductionTextPatchTarget,
} from "@/lib/production-text-workflow-gate";
import type { DeckProject, StepKey } from "@/lib/deck-types";

export type ProductionTextWorkflowPanelProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly runStatus?: ProductionTextWorkflowRunStatus;
  readonly onRun?: () => void;
  readonly onCancel?: () => void;
  readonly onRetry?: () => void;
  readonly onOpenConnectionSettings?: () => void;
  readonly actionLabelOverride?: string;
  readonly disabledReason?: string;
};

export type ProductionTextWorkflowRunStatus = CodexWorkflowRunStatus;

export function ProductionTextWorkflowPanel({
  project,
  step,
  appServerBridge,
  runStatus = { kind: "idle" },
  onRun,
  onCancel,
  onRetry,
  onOpenConnectionSettings,
  actionLabelOverride,
  disabledReason,
}: ProductionTextWorkflowPanelProps) {
  const gate = createProductionTextWorkflowGate({ project, step, appServerBridge });
  if (gate.kind === "not_applicable") return null;
  const isRunning = runStatus.kind === "running";
  const liveStatus = createCodexLiveStatusView({
    bridge: appServerBridge,
    login: { kind: "idle" },
    smoke: { kind: "idle" },
    workflow: runStatus,
  });
  const actionDisabled =
    gate.kind !== "ready" || isRunning || onRun === undefined || disabledReason !== undefined;
  const actionLabel = isRunning ? "라이브 실행 중" : (actionLabelOverride ?? gate.actionLabel);

  return (
    <section className="mt-6 border border-border bg-paper p-5 text-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium">{gate.title}</div>
          <div className="mt-2 text-muted-foreground">
            {gate.kind === "ready"
              ? `${liveStatus.label}: ${liveStatus.detail}`
              : "필요 조건을 해결해야 라이브 실행을 시작할 수 있습니다."}
          </div>
        </div>
        <Button
          type="button"
          disabled={actionDisabled}
          onClick={onRun}
          className="shrink-0 bg-foreground text-background hover:bg-foreground/90"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {actionLabel}
        </Button>
      </div>
      {disabledReason ? (
        <div className="mt-3 border border-border bg-background p-3 text-xs text-muted-foreground">
          {disabledReason}
        </div>
      ) : null}
      <WorkflowStages gate={gate} />
      {runStatus.kind !== "idle" ? <RunStatusDetails status={runStatus} /> : null}
      {isRunning ? <RunningControls status={runStatus} onCancel={onCancel} /> : null}
      {runStatus.kind === "failed" ? (
        <FailureControls status={runStatus} onRetry={onRetry ?? onRun} />
      ) : null}
      {gate.kind === "ready" ? (
        <ReadyDetails gate={gate} />
      ) : (
        <BlockedDetails gate={gate} onOpenConnectionSettings={onOpenConnectionSettings} />
      )}
    </section>
  );
}

function WorkflowStages({
  gate,
}: {
  readonly gate: Exclude<ProductionTextWorkflowGate, { readonly kind: "not_applicable" }>;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {gate.requiredStages.map((stage) => (
        <span
          key={stage}
          className="border border-border bg-background px-2 py-1 font-mono text-xs"
        >
          {workflowStageLabel(stage)}
        </span>
      ))}
    </div>
  );
}

function ReadyDetails({
  gate,
}: {
  readonly gate: Extract<ProductionTextWorkflowGate, { readonly kind: "ready" }>;
}) {
  return (
    <div className="mt-4 border border-border bg-background p-3 text-xs text-muted-foreground">
      생성될 산출물: {gate.patchTargets.map(patchTargetLabel).join(", ")}
    </div>
  );
}

function BlockedDetails({
  gate,
  onOpenConnectionSettings,
}: {
  readonly gate: Extract<ProductionTextWorkflowGate, { readonly kind: "blocked" }>;
  readonly onOpenConnectionSettings?: () => void;
}) {
  const hasBridgeIssue = gate.issues.some((issue) => issue.code === "app_server_bridge_missing");
  return (
    <div className="mt-4 space-y-3">
      <ul className="space-y-2">
        {gate.issues.map((issue) => (
          <li key={issue.code} className="border border-border bg-background p-3">
            <div className="font-mono text-xs">{issue.code}</div>
            <div className="mt-1 text-muted-foreground">{issue.message}</div>
          </li>
        ))}
      </ul>
      {hasBridgeIssue && onOpenConnectionSettings ? (
        <Button type="button" variant="outline" size="sm" onClick={onOpenConnectionSettings}>
          <Settings className="h-4 w-4" />
          연결 및 실행 환경 열기
        </Button>
      ) : null}
    </div>
  );
}

function workflowStageLabel(stage: ProductionTextWorkflowStage): string {
  switch (stage) {
    case "questions":
      return "인터뷰 질문";
    case "brief":
      return "브리프 생성";
    case "deck_plan":
      return "슬라이드 기획";
    case "design_system":
      return "디자인 시스템";
    case "layout_ir":
      return "레이아웃 구조";
    default:
      return assertNever(stage);
  }
}

function patchTargetLabel(target: ProductionTextPatchTarget): string {
  switch (target) {
    case "brief":
      return "브리프";
    case "plan":
      return "기획";
    case "design":
      return "디자인";
    case "layout":
      return "레이아웃";
    default:
      return assertNever(target);
  }
}

function RunStatusDetails({
  status,
}: {
  readonly status: Exclude<ProductionTextWorkflowRunStatus, { readonly kind: "idle" }>;
}) {
  return (
    <div className="mt-4 border border-border bg-background p-3 text-xs text-muted-foreground">
      {status.message}
    </div>
  );
}

function assertNever(value: never): never {
  throw new Error(`Unexpected production text workflow panel value: ${JSON.stringify(value)}`);
}
