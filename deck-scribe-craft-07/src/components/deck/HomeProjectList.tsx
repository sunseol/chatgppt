import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import {
  LocalProjectDataControls,
  type ProjectFolderOpenStatus,
} from "@/components/deck/LocalProjectDataControls";
import { ProjectDeckThumbnail } from "@/components/deck/ProjectVisualPreview";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/lib/deck-store";
import { openDesktopProjectFolder } from "@/lib/desktop-project-folder";
import { buildLocalProjectFolderExport } from "@/lib/local-data-control";
import { stageToStep, STEPS, type DeckProject } from "@/lib/deck-types";

export function HomeProjectList({
  hydrated,
  projects,
  onCreate,
  onOpenProject,
}: {
  readonly hydrated: boolean;
  readonly projects: readonly DeckProject[];
  readonly onCreate: () => void;
  readonly onOpenProject: (project: DeckProject) => void;
}) {
  if (!hydrated) {
    return <EmptyProjectState label="프로젝트 목록을 불러오는 중입니다." />;
  }
  if (projects.length === 0) {
    return (
      <EmptyProjectState
        label="아직 프로젝트가 없습니다. 새 프로젝트를 만들면 인터뷰부터 시작됩니다."
        onCreate={onCreate}
      />
    );
  }
  return (
    <ul className="min-w-0 divide-y divide-border border border-border bg-paper">
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} onOpen={() => onOpenProject(project)} />
      ))}
    </ul>
  );
}

function EmptyProjectState({
  label,
  onCreate,
}: {
  readonly label: string;
  readonly onCreate?: () => void;
}) {
  return (
    <div className="grid min-h-[320px] place-items-center border border-dashed border-border bg-paper p-10 text-center">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {onCreate ? (
          <Button
            className="mt-5 bg-foreground text-background hover:bg-foreground/90"
            onClick={onCreate}
          >
            <Plus className="h-4 w-4" /> 첫 프로젝트 만들기
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  onOpen,
}: {
  readonly project: DeckProject;
  readonly onOpen: () => void;
}) {
  const step = stageToStep(project.stage);
  const label = STEPS.find((item) => item.key === step)?.label ?? step;
  const needsReview = Object.keys(project.invalidated).length;
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [folderStatus, setFolderStatus] = useState<ProjectFolderOpenStatus>({ kind: "idle" });
  const confirmDelete = () => {
    deleteProject(project.id);
  };
  const openFolder = () => {
    void openProjectFolder(project, setFolderStatus);
  };
  return (
    <li className="grid min-w-0 gap-4 px-4 py-4 sm:grid-cols-[138px_minmax(0,1fr)] lg:grid-cols-[138px_minmax(0,1fr)_120px_120px_52px] lg:items-center lg:px-5">
      <Link
        className="w-fit"
        to="/project/$projectId/$step"
        params={{ projectId: project.id, step }}
      >
        <ProjectDeckThumbnail project={project} compact />
      </Link>
      <div className="min-w-0">
        <Link
          to="/project/$projectId/$step"
          params={{ projectId: project.id, step }}
          className="block min-w-0"
        >
          <div className="truncate font-medium">{project.name}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{project.initialPrompt}</div>
        </Link>
        <LocalProjectDataControls
          project={project}
          deleteArmed={deleteArmed}
          folderStatus={folderStatus}
          onArmDelete={() => setDeleteArmed(true)}
          onConfirmDelete={confirmDelete}
          onExport={() => downloadLocalProjectFolder(project)}
          onOpenFolder={openFolder}
        />
      </div>
      <div className="min-w-0 text-xs">
        <span className="rounded bg-secondary px-2 py-1">{label}</span>
      </div>
      <div className="min-w-0 text-xs text-muted-foreground">
        {needsReview > 0 ? (
          <span className="text-warning">재확인 {needsReview}개</span>
        ) : (
          `${project.slideCount}장`
        )}
      </div>
      <div className="flex justify-start gap-1 lg:justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.preventDefault();
            if (deleteArmed) {
              confirmDelete();
              return;
            }
            setDeleteArmed(true);
          }}
          aria-label={deleteArmed ? "프로젝트 카드 삭제 확인" : "프로젝트 카드 로컬 삭제"}
          title={deleteArmed ? "프로젝트 카드 삭제 확인" : "프로젝트 카드 로컬 삭제"}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Link to="/project/$projectId/$step" params={{ projectId: project.id, step }}>
          <Button variant="ghost" size="icon" aria-label="프로젝트 열기">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </li>
  );
}

async function openProjectFolder(
  project: DeckProject,
  setFolderStatus: (status: ProjectFolderOpenStatus) => void,
): Promise<void> {
  setFolderStatus({ kind: "running" });
  const result = await openDesktopProjectFolder(project);
  switch (result.kind) {
    case "opened":
      setFolderStatus({ kind: "opened", path: result.directoryPath });
      return;
    case "download_required":
      downloadLocalProjectFolderFile(result.file);
      setFolderStatus({ kind: "downloaded", filename: result.file.filename });
      return;
    case "failed":
      setFolderStatus({ kind: "failed", message: result.error.message });
      return;
    default:
      return assertNever(result);
  }
}

function downloadLocalProjectFolder(project: Parameters<typeof buildLocalProjectFolderExport>[0]) {
  downloadLocalProjectFolderFile(buildLocalProjectFolderExport(project));
}

function downloadLocalProjectFolderFile(file: ReturnType<typeof buildLocalProjectFolderExport>) {
  const blob = new Blob([file.content], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled project folder result: ${JSON.stringify(value)}`);
}
