import { AlertTriangle, CheckCircle2, MonitorCog } from "lucide-react";
import type { ClientWorkflowStageRuntime } from "@/lib/client-workflow-stage-selection";
import type { DeckProject, StepKey } from "@/lib/deck-types";
import { getWorkflowStepItems, type WorkflowStepItem } from "@/lib/workflow-stepper";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";
import { createCodexLiveStatusView } from "@/lib/codex-live-status";
import type { ProductionTextWorkflowRunStatus } from "./ProductionTextWorkflowPanel";

export function ProjectCockpit({
  project,
  step,
  runtime,
  appServerBridge,
  codexRunStatus,
  onOpenConnectionSettings,
}: {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly runtime: ClientWorkflowStageRuntime;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly codexRunStatus?: ProductionTextWorkflowRunStatus;
  readonly onOpenConnectionSettings?: () => void;
}) {
  const items = getWorkflowStepItems(project);
  const visibleStep = findStep(items, step);
  const nextLockedStep = items.find((item) => item.status === "locked");
  const runtimeCopy = runtimeSummary(runtime, appServerBridge, codexRunStatus);
  const visibleStepAction = stripActionPrefix(visibleStep.detail);

  return (
    <section className="shrink-0 border-b border-border bg-background px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            현재 작업
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="truncate font-serif text-xl leading-tight">{project.name}</h2>
            <span className="border border-border bg-paper px-2 py-1 text-xs">
              {project.aspectRatio} · {project.slideCount}장
            </span>
          </div>
          <div className="mt-3 hidden gap-3 text-sm md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <CockpitField label="현재 단계" value={visibleStep.label} detail={visibleStepAction} />
            <CockpitField label="다음 액션" value={visibleStepAction} detail={visibleStep.sub} />
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 text-xs xl:w-[28rem]">
          <RuntimeBadge
            label="실행 모드"
            value={runtimeCopy.modeLabel}
            detail={runtimeCopy.detail}
          />
          <RuntimeBadge
            label="Codex"
            value={runtimeCopy.codexLabel}
            detail={runtimeCopy.codexDetail}
            ok={runtimeCopy.codexOk}
            warning={runtimeCopy.codexWarning}
            onClick={onOpenConnectionSettings}
            actionLabel="Codex 연결 설정 열기"
          />
          <RuntimeBadge
            label="승인"
            value={`승인 ${project.approvalLog.length}건`}
            detail={
              nextLockedStep
                ? `다음 잠김: ${stripLockPrefix(nextLockedStep.detail)}`
                : "잠긴 단계 없음"
            }
            warning={nextLockedStep !== undefined}
          />
        </div>
      </div>
    </section>
  );
}

function findStep(items: readonly WorkflowStepItem[], step: StepKey): WorkflowStepItem {
  const found = items.find((item) => item.key === step);
  if (found !== undefined) return found;
  return {
    key: step,
    label: step,
    sub: "Unknown step",
    index: 0,
    reachable: false,
    isCurrent: false,
    status: "locked",
    statusLabel: "잠김",
    detail: "현재 프로젝트 상태에서 이 단계로 이동할 수 없습니다.",
  };
}

function stripLockPrefix(detail: string): string {
  return detail.startsWith("잠김: ") ? detail.slice("잠김: ".length) : detail;
}

function stripActionPrefix(detail: string): string {
  return detail.startsWith("다음 액션: ") ? detail.slice("다음 액션: ".length) : detail;
}

function runtimeSummary(
  runtime: ClientWorkflowStageRuntime,
  appServerBridge: ProductionTextWorkflowBridgeStatus,
  codexRunStatus: ProductionTextWorkflowRunStatus | undefined,
): {
  readonly modeLabel: string;
  readonly detail: string;
  readonly codexLabel: string;
  readonly codexDetail: string;
  readonly codexOk: boolean;
  readonly codexWarning: boolean;
} {
  const codexStatus = createCodexLiveStatusView({
    bridge: appServerBridge,
    login: { kind: "idle" },
    smoke: { kind: "idle" },
    workflow: codexRunStatus ?? { kind: "idle" },
  });
  switch (runtime) {
    case "production":
      return {
        modeLabel: "라이브 실행",
        detail: "실제 Codex 연결을 우선 사용합니다.",
        codexLabel: codexStatus.label,
        codexDetail: codexStatusDetail(codexStatus),
        codexOk: codexStatus.kind !== "bridge_missing" && codexStatus.kind !== "failed",
        codexWarning: codexStatus.kind === "failed" || codexStatus.kind === "login_required",
      };
    case "development":
      return {
        modeLabel: "샘플 화면 모드",
        detail: "실제 Codex 실행이 아닙니다.",
        codexLabel: "Codex 미연결",
        codexDetail: "DMG/Tauri 앱에서 연결 후 라이브 실행합니다.",
        codexOk: false,
        codexWarning: false,
      };
    default:
      return assertNever(runtime);
  }
}

function codexStatusDetail(codexStatus: ReturnType<typeof createCodexLiveStatusView>): string {
  if (codexStatus.error) {
    return `${codexStatus.summary}. 원인: ${codexStatus.error.cause}. 조치: ${codexStatus.error.action}`;
  }
  return `${codexStatus.summary}. ${codexStatus.detail}`;
}

function CockpitField({
  label,
  value,
  detail,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <div className="min-w-0 border-l border-border pl-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
      <div className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{detail}</div>
    </div>
  );
}

function RuntimeBadge({
  label,
  value,
  detail,
  ok = true,
  warning = false,
  onClick,
  actionLabel,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly ok?: boolean;
  readonly warning?: boolean;
  readonly onClick?: () => void;
  readonly actionLabel?: string;
}) {
  const Icon = warning ? AlertTriangle : ok ? CheckCircle2 : MonitorCog;
  const content = (
    <>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex min-w-0 items-center gap-2">
        <Icon className={warning ? "h-4 w-4 shrink-0 text-warning" : "h-4 w-4 shrink-0"} />
        <span className="truncate font-medium">{value}</span>
      </div>
      <div className="mt-1 hidden text-muted-foreground sm:line-clamp-2">{detail}</div>
      {actionLabel ? <span className="sr-only">{actionLabel}</span> : null}
    </>
  );
  const className = "min-w-0 border border-border bg-paper p-2 sm:p-3";
  if (onClick) {
    return (
      <button
        type="button"
        aria-label={actionLabel}
        title={actionLabel}
        className={`${className} text-left transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected project cockpit runtime: ${String(value)}`);
}
