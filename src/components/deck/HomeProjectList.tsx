import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { LocalProjectDataControls } from "@/components/deck/LocalProjectDataControls";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/lib/deck-store";
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
    <ul className="divide-y divide-border border border-border bg-paper">
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
            <Plus className="h-4 w-4" /> 새 프로젝트
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
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_120px_120px_52px] items-center gap-4 px-5 py-4">
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
          onOpen={onOpen}
          onExport={() => downloadLocalProjectFolder(project)}
          onDelete={() => {
            if (confirm("이 로컬 프로젝트를 삭제할까요?")) deleteProject(project.id);
          }}
        />
      </div>
      <div className="text-xs">
        <span className="rounded bg-secondary px-2 py-1">{label}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {needsReview > 0 ? (
          <span className="text-warning">재확인 {needsReview}개</span>
        ) : (
          `${project.slideCount}장`
        )}
      </div>
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.preventDefault();
            if (confirm("이 프로젝트를 삭제할까요?")) deleteProject(project.id);
          }}
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

function downloadLocalProjectFolder(project: Parameters<typeof buildLocalProjectFolderExport>[0]) {
  const file = buildLocalProjectFolderExport(project);
  const blob = new Blob([file.content], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
