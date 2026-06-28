import { CloudOff, Download, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeckProject } from "@/lib/deck-types";
import { describeLocalProjectStorage } from "@/lib/local-data-control";

export type ProjectFolderOpenStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running" }
  | { readonly kind: "opened"; readonly path: string }
  | { readonly kind: "downloaded"; readonly filename: string }
  | { readonly kind: "failed"; readonly message: string };

export function LocalProjectDataControls({
  project,
  deleteArmed,
  folderStatus,
  onArmDelete,
  onConfirmDelete,
  onExport,
  onOpenFolder,
}: {
  readonly project: DeckProject;
  readonly deleteArmed: boolean;
  readonly folderStatus: ProjectFolderOpenStatus;
  readonly onArmDelete: () => void;
  readonly onConfirmDelete: () => void;
  readonly onExport: () => void;
  readonly onOpenFolder: () => void;
}) {
  const storage = describeLocalProjectStorage(project);
  return (
    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
      <span className="font-medium text-foreground">저장 위치</span>
      <span className="max-w-full break-all font-mono">{storage.storageKey}</span>
      <span className="max-w-full break-all font-mono">{storage.virtualFolderPath}</span>
      <span className="inline-flex items-center gap-1">
        <CloudOff className="h-3.5 w-3.5" />
        클라우드 동기화 없음
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto min-h-8 max-w-full whitespace-normal px-2 py-1.5"
        title="Finder에서 열기"
        onClick={onOpenFolder}
        disabled={folderStatus.kind === "running"}
      >
        <FolderOpen className="h-3.5 w-3.5" />
        {folderStatus.kind === "running" ? "폴더 준비 중" : "Finder에서 열기"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto min-h-8 max-w-full whitespace-normal px-2 py-1.5"
        title="프로젝트 폴더 내보내기"
        onClick={onExport}
      >
        <Download className="h-3.5 w-3.5" />
        프로젝트 폴더 내보내기
      </Button>
      <Button
        variant={deleteArmed ? "destructive" : "ghost"}
        size="sm"
        className="h-auto min-h-8 max-w-full whitespace-normal px-2 py-1.5"
        title={deleteArmed ? "삭제 확인" : "로컬 삭제"}
        onClick={deleteArmed ? onConfirmDelete : onArmDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleteArmed ? "삭제 확인" : "로컬 삭제"}
      </Button>
      {folderStatus.kind === "opened" ? (
        <span className="max-w-full break-all font-mono text-accent">{folderStatus.path}</span>
      ) : null}
      {folderStatus.kind === "downloaded" ? (
        <span className="max-w-full break-all font-mono text-accent">{folderStatus.filename}</span>
      ) : null}
      {folderStatus.kind === "failed" ? (
        <span className="text-warning">{folderStatus.message}</span>
      ) : null}
    </div>
  );
}
