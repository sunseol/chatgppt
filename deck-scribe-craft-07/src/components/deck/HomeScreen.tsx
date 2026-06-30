import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { CircleHelp, Database, FolderOpen, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HomeProjectList } from "@/components/deck/HomeProjectList";
import {
  HomeToolDialog,
  type SettingsCodexLoginStatus,
  type SettingsSmokeStatus,
  type ToolDialog,
} from "@/components/deck/HomeToolDialog";
import { NewProjectForm } from "@/components/deck/NewProjectForm";
import { WorkflowMiniMap } from "@/components/deck/ProjectVisualPreview";
import {
  openCodexLoginTerminal,
  refreshCodexLoginStatus,
  runSettingsSmoke,
} from "@/components/deck/codex-settings-actions";
import { deleteProject, useProjectList } from "@/lib/deck-store";
import { stageToStep } from "@/lib/deck-types";
import { getDesktopAppServerBridgeStatus } from "@/lib/desktop-app-server-bridge";
import { buildLocalProjectArchiveExport } from "@/lib/local-data-control";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export function HomeScreen() {
  const navigate = useNavigate();
  const projects = useProjectList();
  const [createOpen, setCreateOpen] = useState(false);
  const [toolDialog, setToolDialog] = useState<ToolDialog | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [appServerBridge, setAppServerBridge] =
    useState<ProductionTextWorkflowBridgeStatus>("missing");
  const [loginStatus, setLoginStatus] = useState<SettingsCodexLoginStatus>({ kind: "idle" });
  const [smokeStatus, setSmokeStatus] = useState<SettingsSmokeStatus>({ kind: "idle" });
  const [deleteAllArmed, setDeleteAllArmed] = useState(false);
  const activeProject = projects[0];
  const activeStage = hydrated ? (activeProject?.stage ?? "PROJECT_CREATED") : "PROJECT_CREATED";

  useEffect(() => {
    setHydrated(true);
    const bridge = getDesktopAppServerBridgeStatus();
    setAppServerBridge(bridge);
    if (bridge === "available") void refreshCodexLoginStatus(setLoginStatus);
  }, []);

  const refreshLogin = () => {
    void refreshCodexLoginStatus(setLoginStatus);
  };
  const openLogin = () => {
    void openCodexLoginTerminal(setLoginStatus);
  };
  const runSmoke = () => {
    void runSettingsSmoke(setSmokeStatus);
  };
  const exportAllProjects = () => {
    downloadFile(buildLocalProjectArchiveExport(projects));
  };
  const deleteAllProjects = () => {
    for (const project of projects) deleteProject(project.id);
    setDeleteAllArmed(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-paper">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="min-w-0">
              <div className="font-serif text-lg leading-none">DeckForge</div>
              <div className="text-[11px] text-muted-foreground">데스크탑 슬라이드 제작</div>
            </div>
          </div>
          <div className="flex w-full min-w-0 items-center justify-between gap-1.5 sm:w-auto sm:justify-end">
            <HeaderTool
              icon={<Settings />}
              label="연결 및 실행 환경"
              onClick={() => setToolDialog("settings")}
            />
            <HeaderTool
              icon={<FolderOpen />}
              label="로컬 데이터"
              onClick={() => setToolDialog("data")}
            />
            <HeaderTool
              icon={<CircleHelp />}
              label="도움말"
              onClick={() => setToolDialog("help")}
            />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  aria-label="새 프로젝트"
                  title="새 프로젝트"
                  className="ml-1 h-9 w-9 shrink-0 bg-foreground px-0 text-background hover:bg-foreground/90 sm:ml-2 sm:w-auto sm:px-4"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">새 프로젝트</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[calc(100vh-3rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">새 프로젝트 시작</DialogTitle>
                  <DialogDescription>
                    슬라이드 목적과 분량을 정하면 인터뷰 단계부터 이어집니다.
                  </DialogDescription>
                </DialogHeader>
                <NewProjectForm
                  onCreated={() => setCreateOpen(false)}
                  onOpenConnectionSettings={() => {
                    setCreateOpen(false);
                    setToolDialog("settings");
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:overflow-hidden">
        <section className="min-w-0 px-4 py-5 lg:min-h-0 lg:overflow-y-auto lg:overscroll-none lg:px-8 lg:py-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-accent">
                Project Workspace
              </div>
              <h1 className="mt-2 font-serif text-3xl tracking-tight">프로젝트</h1>
            </div>
            <div className="text-xs text-muted-foreground">
              {hydrated ? `${projects.length}개` : "불러오는 중"}
            </div>
          </div>

          <HomeProjectList
            hydrated={hydrated}
            projects={projects}
            onCreate={() => setCreateOpen(true)}
            onOpenProject={(project) =>
              navigate({
                to: "/project/$projectId/$step",
                params: { projectId: project.id, step: stageToStep(project.stage) },
              })
            }
          />
        </section>

        <aside className="border-t border-border bg-paper p-4 lg:border-l lg:border-t-0 lg:p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            현재 작업 기준
          </div>
          <div className="mt-4">
            <WorkflowMiniMap activeStep={activeStage} />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <SideNote title="단계별 확인" body="각 단계의 결과를 보고 다음 단계로 넘어갑니다." />
            <SideNote
              title="로컬 우선"
              body="라이브 산출물과 내보내기 파일은 이 기기에서 확인합니다."
            />
            <SideNote
              title="편집 가능 결과"
              body="마지막에는 텍스트와 도형을 직접 조정할 수 있습니다."
            />
          </div>
          <Button
            variant="outline"
            className="mt-6 w-full justify-start"
            onClick={() => setToolDialog("data")}
          >
            <Database className="h-4 w-4" />
            로컬 데이터 보기
          </Button>
        </aside>
      </main>

      <HomeToolDialog
        dialog={toolDialog}
        projects={projects}
        appServerBridge={appServerBridge}
        loginStatus={loginStatus}
        smokeStatus={smokeStatus}
        deleteAllArmed={deleteAllArmed}
        onOpenChange={(open) => setToolDialog(open ? toolDialog : null)}
        onRefreshLogin={refreshLogin}
        onOpenLogin={openLogin}
        onRunSmoke={runSmoke}
        onExportAll={exportAllProjects}
        onArmDeleteAll={() => setDeleteAllArmed(true)}
        onConfirmDeleteAll={deleteAllProjects}
      />
    </div>
  );
}

function downloadFile(file: {
  readonly filename: string;
  readonly mime: string;
  readonly content: string;
}) {
  const blob = new Blob([file.content], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function HeaderTool({
  icon,
  label,
  onClick,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="icon" title={label} aria-label={label} onClick={onClick}>
      {icon}
    </Button>
  );
}

function SideNote({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div className="border border-border bg-background p-3">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</div>
    </div>
  );
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="3" width="6" height="26" fill="var(--accent)" />
      <line x1="13" y1="11" x2="25" y2="11" stroke="currentColor" strokeWidth="1.5" />
      <line x1="13" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" />
      <line x1="13" y1="21" x2="20" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
