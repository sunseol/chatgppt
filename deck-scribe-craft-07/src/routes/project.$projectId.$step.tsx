import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import { isStepReachable, stageToStep, useProject } from "@/lib/deck-store";
import { Stepper } from "@/components/deck/Stepper";
import { ProjectCockpit } from "@/components/deck/ProjectCockpit";
import {
  SettingsDialogBody,
  type SettingsCodexLoginStatus,
  type SettingsSmokeStatus,
} from "@/components/deck/HomeSettingsDialog";
import {
  ProductionWorkflowStage,
  type WorkflowStageProps,
} from "@/components/deck/ProductionWorkflowStage";
import type { ProductionTextWorkflowRunStatus } from "@/components/deck/ProductionTextWorkflowPanel";
import {
  isCodexLoginVerified,
  openCodexLoginTerminal,
  refreshCodexLoginStatus,
  runSettingsSmoke,
} from "@/components/deck/codex-settings-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDesktopAppServerBridgeStatus } from "@/lib/desktop-app-server-bridge";
import {
  selectClientWorkflowStageRuntime,
  type ClientWorkflowStageRuntime,
} from "@/lib/client-workflow-stage-selection";
import type { StepKey } from "@/lib/deck-types";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";
import type { WorkflowPrimaryAction } from "@/components/deck/workflow-primary-action";
import { ChevronLeft } from "lucide-react";

type ConnectionSettingsIntent = "general" | "codex_required";

const VALID_STEPS: StepKey[] = [
  "project",
  "interview",
  "research",
  "plan",
  "design",
  "layout",
  "generate",
  "review",
  "vectorize",
  "editor",
  "export",
];

function isStepKey(value: string): value is StepKey {
  return VALID_STEPS.some((step) => step === value);
}

export const Route = createFileRoute("/project/$projectId/$step")({
  head: ({ params }) => ({
    meta: [
      { title: `프로젝트 · ${params.step} — DeckForge` },
      { name: "description", content: "DeckForge workflow stage" },
    ],
  }),
  component: ProjectStagePage,
});

function ProjectStagePage() {
  const { projectId, step } = useParams({ from: "/project/$projectId/$step" });
  const project = useProject(projectId);
  const [hydrated, setHydrated] = useState(false);
  const [connectionSettingsOpen, setConnectionSettingsOpen] = useState(false);
  const [connectionSettingsIntent, setConnectionSettingsIntent] =
    useState<ConnectionSettingsIntent>("general");
  const [appServerBridge, setAppServerBridge] =
    useState<ProductionTextWorkflowBridgeStatus>("missing");
  const [loginStatus, setLoginStatus] = useState<SettingsCodexLoginStatus>({ kind: "idle" });
  const [smokeStatus, setSmokeStatus] = useState<SettingsSmokeStatus>({ kind: "idle" });
  const [productionRunStatus, setProductionRunStatus] = useState<ProductionTextWorkflowRunStatus>({
    kind: "idle",
  });
  const [primaryAction, setPrimaryAction] = useState<WorkflowPrimaryAction | undefined>();
  const updatePrimaryAction = useCallback((action: WorkflowPrimaryAction | undefined) => {
    setPrimaryAction(() => action);
  }, []);

  useEffect(() => {
    setHydrated(true);
    const bridge = getDesktopAppServerBridgeStatus();
    setAppServerBridge(bridge);
    if (bridge === "available") void refreshCodexLoginStatus(setLoginStatus);
  }, []);

  useEffect(() => {
    setProductionRunStatus({ kind: "idle" });
    updatePrimaryAction(undefined);
  }, [projectId, step, updatePrimaryAction]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-serif text-2xl">프로젝트 불러오는 중</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-2xl">프로젝트를 찾을 수 없습니다</div>
          <Link to="/" className="mt-4 inline-block text-sm text-accent underline">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  if (!isStepKey(step)) {
    return <Navigate to="/project/$projectId/$step" params={{ projectId, step: "project" }} />;
  }

  if (step === "vectorize") {
    return <Navigate to="/project/$projectId/$step" params={{ projectId, step: "editor" }} />;
  }

  if (!isStepReachable(project, step)) {
    return (
      <Navigate
        to="/project/$projectId/$step"
        params={{ projectId, step: stageToStep(project.stage) }}
      />
    );
  }

  const runtime = selectClientWorkflowStageRuntime({
    isProductionBuild: import.meta.env.PROD,
    appServerBridge,
  });
  const openConnectionSettings = () => {
    const bridge = getDesktopAppServerBridgeStatus();
    setAppServerBridge(bridge);
    setConnectionSettingsIntent("general");
    setConnectionSettingsOpen(true);
    if (bridge === "available" && loginStatus.kind === "idle") {
      void refreshCodexLoginStatus(setLoginStatus);
    }
  };
  const openCodexRequiredConnection = () => {
    const bridge = getDesktopAppServerBridgeStatus();
    setAppServerBridge(bridge);
    setConnectionSettingsIntent("codex_required");
    setConnectionSettingsOpen(true);
    if (bridge === "available" && !isCodexLoginVerified(loginStatus)) {
      void refreshCodexLoginStatus(setLoginStatus);
    }
  };
  const refreshLogin = () => {
    setAppServerBridge(getDesktopAppServerBridgeStatus());
    void refreshCodexLoginStatus(setLoginStatus);
  };
  const openLogin = () => {
    setAppServerBridge(getDesktopAppServerBridgeStatus());
    void openCodexLoginTerminal(setLoginStatus);
  };
  const runSmoke = () => {
    setAppServerBridge(getDesktopAppServerBridgeStatus());
    void runSettingsSmoke(setSmokeStatus);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="flex min-h-0 shrink-0 flex-col border-b border-border bg-paper lg:h-screen lg:border-b-0 lg:border-r">
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
        <ProjectCockpit
          project={project}
          step={step}
          runtime={runtime}
          appServerBridge={appServerBridge}
          codexLoginStatus={runtime === "production" ? loginStatus : undefined}
          codexRunStatus={runtime === "production" ? productionRunStatus : undefined}
          primaryAction={primaryAction}
          onOpenConnectionSettings={openConnectionSettings}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <WorkflowStage
            project={project}
            step={step}
            runtime={runtime}
            appServerBridge={appServerBridge}
            runStatus={productionRunStatus}
            onRunStatusChange={setProductionRunStatus}
            onOpenConnectionSettings={openConnectionSettings}
            codexLoginVerified={isCodexLoginVerified(loginStatus)}
            onRequireCodexConnection={openCodexRequiredConnection}
            onPrimaryActionChange={updatePrimaryAction}
          />
        </div>
      </main>
      <Dialog open={connectionSettingsOpen} onOpenChange={setConnectionSettingsOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[42rem] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{connectionDialogTitle(connectionSettingsIntent)}</DialogTitle>
            <DialogDescription>{connectionDialogDescription(connectionSettingsIntent)}</DialogDescription>
          </DialogHeader>
          <SettingsDialogBody
            appServerBridge={appServerBridge}
            loginStatus={loginStatus}
            smokeStatus={smokeStatus}
            onRefreshLogin={refreshLogin}
            onOpenLogin={openLogin}
            onRunSmoke={runSmoke}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function connectionDialogTitle(intent: ConnectionSettingsIntent): string {
  if (intent === "codex_required") return "Codex 연결이 필요합니다";
  return "연결 및 실행 환경";
}

function connectionDialogDescription(intent: ConnectionSettingsIntent): string {
  if (intent === "codex_required") {
    return "인터뷰 실행 전에 Codex CLI 로그인 세션이 필요합니다. 아래에서 상태를 확인하거나 Codex 로그인을 연 뒤 다시 실행하세요.";
  }
  return "Codex 로그인, 라이브 실행 테스트, provider 준비 상태를 확인합니다.";
}

type ResolvedWorkflowStageProps = WorkflowStageProps & {
  readonly runtime: ClientWorkflowStageRuntime;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
};

function WorkflowStage({ runtime, appServerBridge, ...props }: ResolvedWorkflowStageProps) {
  if (runtime === "production") {
    return <ProductionWorkflowStage {...props} appServerBridge={appServerBridge} />;
  }
  return <DevelopmentWorkflowStageLoader {...props} />;
}

function DevelopmentWorkflowStageLoader(props: WorkflowStageProps) {
  const [Component, setComponent] = useState<ComponentType<WorkflowStageProps>>();

  useEffect(() => {
    let mounted = true;
    void import("@/components/deck/DevelopmentWorkflowStage").then((module) => {
      if (mounted) setComponent(() => module.DevelopmentWorkflowStage);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (Component === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-serif text-2xl">워크플로 불러오는 중</div>
      </div>
    );
  }

  return <Component {...props} />;
}
