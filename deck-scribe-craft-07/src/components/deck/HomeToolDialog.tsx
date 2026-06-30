import { Database, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SettingsDialogBody,
  type SettingsCodexLoginStatus,
  type SettingsSmokeStatus,
} from "@/components/deck/HomeSettingsDialog";
import type { DeckProject } from "@/lib/deck-types";
import { LOCAL_PROJECT_STORAGE_KEY } from "@/lib/local-data-control";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export type ToolDialog = "settings" | "data" | "help";

export { SettingsDialogBody };
export type { SettingsCodexLoginStatus, SettingsSmokeStatus };

export function HomeToolDialog({
  dialog,
  projects,
  appServerBridge,
  loginStatus,
  smokeStatus,
  deleteAllArmed,
  onOpenChange,
  onRefreshLogin,
  onOpenLogin,
  onRunSmoke,
  onExportAll,
  onArmDeleteAll,
  onConfirmDeleteAll,
}: {
  readonly dialog: ToolDialog | null;
  readonly projects: readonly DeckProject[];
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly loginStatus: SettingsCodexLoginStatus;
  readonly smokeStatus: SettingsSmokeStatus;
  readonly deleteAllArmed: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRefreshLogin: () => void;
  readonly onOpenLogin: () => void;
  readonly onRunSmoke: () => void;
  readonly onExportAll: () => void;
  readonly onArmDeleteAll: () => void;
  readonly onConfirmDeleteAll: () => void;
}) {
  return (
    <Dialog open={dialog !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[42rem] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle(dialog)}</DialogTitle>
          <DialogDescription>{dialogDescription(dialog)}</DialogDescription>
        </DialogHeader>
        {dialog === "settings" ? (
          <SettingsDialogBody
            appServerBridge={appServerBridge}
            loginStatus={loginStatus}
            smokeStatus={smokeStatus}
            onRefreshLogin={onRefreshLogin}
            onOpenLogin={onOpenLogin}
            onRunSmoke={onRunSmoke}
          />
        ) : null}
        {dialog === "data" ? (
          <LocalDataDialogBody
            projects={projects}
            deleteAllArmed={deleteAllArmed}
            onExportAll={onExportAll}
            onArmDeleteAll={onArmDeleteAll}
            onConfirmDeleteAll={onConfirmDeleteAll}
          />
        ) : null}
        {dialog === "help" ? <HelpDialogBody /> : null}
      </DialogContent>
    </Dialog>
  );
}

export function LocalDataDialogBody({
  projects,
  deleteAllArmed,
  onExportAll,
  onArmDeleteAll,
  onConfirmDeleteAll,
}: {
  readonly projects: readonly DeckProject[];
  readonly deleteAllArmed: boolean;
  readonly onExportAll: () => void;
  readonly onArmDeleteAll: () => void;
  readonly onConfirmDeleteAll: () => void;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <StatusTile label="프로젝트" value={`${projects.length}개`} />
        <StatusTile label="저장소" value={LOCAL_PROJECT_STORAGE_KEY} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onExportAll}
          disabled={projects.length === 0}
        >
          <Database className="h-4 w-4" />
          전체 프로젝트 내보내기
        </Button>
        <Button
          type="button"
          variant={deleteAllArmed ? "destructive" : "outline"}
          onClick={deleteAllArmed ? onConfirmDeleteAll : onArmDeleteAll}
          disabled={projects.length === 0}
        >
          <Trash2 className="h-4 w-4" />
          {deleteAllArmed ? "전체 삭제 확인" : "전체 로컬 삭제"}
        </Button>
      </div>
      <ul className="max-h-52 divide-y divide-border overflow-auto border border-border">
        {projects.map((project) => (
          <li key={project.id} className="px-3 py-2">
            <div className="font-medium">{project.name}</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              projects/{project.id}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HelpDialogBody() {
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <p>새 프로젝트를 만든 뒤 인터뷰, 조사, 기획, 디자인, 레이아웃 단계를 순서대로 진행합니다.</p>
      <p>
        각 프로젝트 행의 Finder 버튼은 이 앱의 로컬 프로젝트 폴더를 준비한 뒤 Finder에서 엽니다.
      </p>
    </div>
  );
}

function StatusTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-border bg-background p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-mono text-xs">{value}</div>
    </div>
  );
}

function dialogTitle(dialog: ToolDialog | null): string {
  if (dialog === "settings") return "연결 및 실행 환경";
  if (dialog === "data") return "로컬 데이터";
  return "도움말";
}

function dialogDescription(dialog: ToolDialog | null): string {
  if (dialog === "settings")
    return "Codex 로그인, 라이브 실행 테스트, provider 준비 상태를 확인합니다.";
  if (dialog === "data") return "로컬 프로젝트를 내보내거나 기기에서 삭제합니다.";
  return "DeckForge 데스크탑 워크플로우의 기본 진행 방식입니다.";
}
