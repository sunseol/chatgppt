import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { isStepReachable, stageToStep, useProject } from "@/lib/deck-store";
import { ProjectStageFrame } from "@/components/deck/ProjectStageFrame";
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
  const [appServerBridge, setAppServerBridge] =
    useState<ProductionTextWorkflowBridgeStatus>("missing");
  const [loginStatus, setLoginStatus] = useState<SettingsCodexLoginStatus>({ kind: "idle" });
  const [smokeStatus, setSmokeStatus] = useState<SettingsSmokeStatus>({ kind: "idle" });
  const [productionRunStatus, setProductionRunStatus] = useState<ProductionTextWorkflowRunStatus>({
    kind: "idle",
  });

  useEffect(() => {
    setHydrated(true);
    const bridge = getDesktopAppServerBridgeStatus();
    setAppServerBridge(bridge);
    if (bridge === "available") void refreshCodexLoginStatus(setLoginStatus);
  }, []);

  useEffect(() => {
    setProductionRunStatus({ kind: "idle" });
  }, [projectId, step]);

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
    setConnectionSettingsOpen(true);
    if (bridge === "available" && loginStatus.kind === "idle") {
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
    <>
      <ProjectStageFrame
        project={project}
        step={step}
        runtime={runtime}
        appServerBridge={appServerBridge}
        productionRunStatus={productionRunStatus}
        onOpenConnectionSettings={openConnectionSettings}
      >
        <WorkflowStage
          project={project}
          step={step}
          runtime={runtime}
          appServerBridge={appServerBridge}
          runStatus={productionRunStatus}
          onRunStatusChange={setProductionRunStatus}
          onOpenConnectionSettings={openConnectionSettings}
        />
      </ProjectStageFrame>
      <Dialog open={connectionSettingsOpen} onOpenChange={setConnectionSettingsOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[42rem] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>연결 및 실행 환경</DialogTitle>
            <DialogDescription>
              Codex 로그인, 라이브 실행 테스트, provider 준비 상태를 확인합니다.
            </DialogDescription>
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
    </>
  );
}

type ResolvedWorkflowStageProps = WorkflowStageProps & {
  readonly runtime: ClientWorkflowStageRuntime;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
};

function WorkflowStage({ runtime, appServerBridge, ...props }: ResolvedWorkflowStageProps) {
  if (runtime === "production" && isProductionLateStage(props.step)) {
    return <DevelopmentWorkflowStageLoader {...props} productionLateStage />;
  }
  if (runtime === "production") {
    return <ProductionWorkflowStage {...props} appServerBridge={appServerBridge} />;
  }
  return <DevelopmentWorkflowStageLoader {...props} />;
}

function isProductionLateStage(step: StepKey): boolean {
  return step === "generate" || step === "review" || step === "editor" || step === "export";
}

type DevelopmentWorkflowStageLoaderProps = WorkflowStageProps & {
  readonly productionLateStage?: boolean;
};

function DevelopmentWorkflowStageLoader(props: DevelopmentWorkflowStageLoaderProps) {
  const [Component, setComponent] = useState<ComponentType<DevelopmentWorkflowStageLoaderProps>>();

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
