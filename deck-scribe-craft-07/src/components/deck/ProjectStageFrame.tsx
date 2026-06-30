import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ProjectCockpit } from "@/components/deck/ProjectCockpit";
import { Stepper } from "@/components/deck/Stepper";
import type { ProductionTextWorkflowRunStatus } from "@/components/deck/ProductionTextWorkflowPanel";
import type { ClientWorkflowStageRuntime } from "@/lib/client-workflow-stage-selection";
import type { DeckProject, StepKey } from "@/lib/deck-types";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export function ProjectStageFrame({
  appServerBridge,
  children,
  onOpenConnectionSettings,
  productionRunStatus,
  project,
  runtime,
  step,
}: {
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly children: ReactNode;
  readonly onOpenConnectionSettings: () => void;
  readonly productionRunStatus: ProductionTextWorkflowRunStatus;
  readonly project: DeckProject;
  readonly runtime: ClientWorkflowStageRuntime;
  readonly step: StepKey;
}) {
  const mobileFocusStage = step === "review" || step === "export";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background lg:grid lg:grid-cols-[280px_1fr]">
      <aside
        className={`flex min-h-0 shrink-0 flex-col border-b border-border bg-paper lg:h-screen lg:border-b-0 lg:border-r ${
          mobileFocusStage ? "max-sm:hidden" : ""
        }`}
      >
        <div className="border-b border-border px-4 py-3 lg:py-4">
          <Link
            to="/"
            className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> 프로젝트 목록
          </Link>
          <div className="truncate font-serif text-base">{project.name}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {project.aspectRatio} · {project.slideCount}장
          </div>
        </div>
        <div className="min-h-0 max-h-40 overflow-y-auto overscroll-none py-2 lg:max-h-none lg:flex-1 lg:py-3">
          <Stepper project={project} />
        </div>
        <div className="hidden border-t border-border px-4 py-3 text-[11px] text-muted-foreground lg:block">
          <div>승인 {project.approvalLog.length}건</div>
          <div className="mt-1 font-mono">{project.stage}</div>
        </div>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className={mobileFocusStage ? "max-sm:hidden" : ""}>
          <ProjectCockpit
            project={project}
            step={step}
            runtime={runtime}
            appServerBridge={appServerBridge}
            codexRunStatus={runtime === "production" ? productionRunStatus : undefined}
            onOpenConnectionSettings={onOpenConnectionSettings}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
