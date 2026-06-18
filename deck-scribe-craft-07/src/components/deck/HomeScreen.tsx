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
import { NewProjectForm } from "@/components/deck/NewProjectForm";
import { WorkflowMiniMap } from "@/components/deck/ProjectVisualPreview";
import { useProjectList } from "@/lib/deck-store";
import { stageToStep } from "@/lib/deck-types";

type ToolDialog = "settings" | "data" | "help";

export function HomeScreen() {
  const navigate = useNavigate();
  const projects = useProjectList();
  const [createOpen, setCreateOpen] = useState(false);
  const [toolDialog, setToolDialog] = useState<ToolDialog | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const activeProject = projects[0];
  const activeStage = hydrated ? (activeProject?.stage ?? "PROJECT_CREATED") : "PROJECT_CREATED";

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-paper">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="font-serif text-lg leading-none">DeckForge</div>
              <div className="text-[11px] text-muted-foreground">데스크탑 슬라이드 제작</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <HeaderTool
              icon={<Settings />}
              label="설정"
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
                <Button className="ml-2 bg-foreground text-background hover:bg-foreground/90">
                  <Plus className="h-4 w-4" /> 새 프로젝트
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[calc(100vh-3rem)] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">새 프로젝트 시작</DialogTitle>
                  <DialogDescription>
                    슬라이드 목적과 분량을 정하면 인터뷰 단계부터 이어집니다.
                  </DialogDescription>
                </DialogHeader>
                <NewProjectForm onCreated={() => setCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] overflow-hidden">
        <section className="desktop-scroll px-8 py-8">
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

        <aside className="border-l border-border bg-paper p-5">
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
              body="목업 데이터와 내보내기 파일은 이 기기에서 확인합니다."
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

      <ToolInfoDialog
        dialog={toolDialog}
        onOpenChange={(open) => setToolDialog(open ? toolDialog : null)}
      />
    </div>
  );
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

function ToolInfoDialog({
  dialog,
  onOpenChange,
}: {
  readonly dialog: ToolDialog | null;
  readonly onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={dialog !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle(dialog)}</DialogTitle>
          <DialogDescription>{dialogDescription(dialog)}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function dialogTitle(dialog: ToolDialog | null): string {
  if (dialog === "settings") return "설정";
  if (dialog === "data") return "로컬 데이터";
  return "도움말";
}

function dialogDescription(dialog: ToolDialog | null): string {
  if (dialog === "settings")
    return "목업에서는 창 크기, 언어, 내보내기 기본값을 확인하는 자리입니다.";
  if (dialog === "data")
    return "프로젝트는 브라우저 로컬 저장소에 저장되며, 각 프로젝트 행에서 파일로 내보낼 수 있습니다.";
  return "새 프로젝트를 만든 뒤 왼쪽 단계 목록을 따라 인터뷰, 조사, 기획, 디자인, 편집을 진행합니다.";
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="3" width="6" height="26" fill="oklch(0.74 0.16 60)" />
      <line x1="13" y1="11" x2="25" y2="11" stroke="currentColor" strokeWidth="1.5" />
      <line x1="13" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" />
      <line x1="13" y1="21" x2="20" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
