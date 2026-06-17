import { CloudOff, Download, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeckProject } from "@/lib/deck-types";
import { describeLocalProjectStorage } from "@/lib/local-data-control";

export function LocalProjectDataControls({
  project,
  onDelete,
  onExport,
  onOpen,
}: {
  readonly project: DeckProject;
  readonly onDelete: () => void;
  readonly onExport: () => void;
  readonly onOpen: () => void;
}) {
  const storage = describeLocalProjectStorage(project);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">저장 위치</span>
      <span className="font-mono">{storage.storageKey}</span>
      <span className="font-mono">{storage.virtualFolderPath}</span>
      <span className="inline-flex items-center gap-1">
        <CloudOff className="h-3.5 w-3.5" />
        클라우드 동기화 없음
      </span>
      <Button variant="ghost" size="sm" title="프로젝트 폴더 열기" onClick={onOpen}>
        <FolderOpen className="h-3.5 w-3.5" />
        프로젝트 폴더 열기
      </Button>
      <Button variant="ghost" size="sm" title="프로젝트 폴더 내보내기" onClick={onExport}>
        <Download className="h-3.5 w-3.5" />
        프로젝트 폴더 내보내기
      </Button>
      <Button variant="ghost" size="sm" title="로컬 삭제" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
        로컬 삭제
      </Button>
    </div>
  );
}
