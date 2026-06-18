import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectDeckThumbnail } from "@/components/deck/ProjectVisualPreview";
import { StageHeader, StageScroll, StageShell } from "@/components/deck/stage-shared";
import { updateProject } from "@/lib/deck-store";
import type { DeckProject } from "@/lib/deck-types";

export function ProjectStage({ project }: { readonly project: DeckProject }) {
  return (
    <StageShell>
      <StageScroll className="mx-auto max-w-5xl px-8">
        <StageHeader num="00" sub="Project Brief" title="프로젝트 정보" />
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <dl className="grid grid-cols-2 gap-x-12 gap-y-6 border-t border-border pt-6 text-sm">
            <Field label="이름" value={project.name} />
            <Field label="생성일" value={new Date(project.createdAt).toLocaleString("ko-KR")} />
            <Field label="화면 비율" value={project.aspectRatio} />
            <Field label="언어" value={project.language} />
            <Field label="슬라이드 수" value={String(project.slideCount)} />
            <Field label="현재 단계" value={stageLabel(project.stage)} />
            <div className="col-span-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                초기 요청
              </div>
              <p className="mt-2 whitespace-pre-wrap text-foreground">{project.initialPrompt}</p>
            </div>
          </dl>
          <ProjectPreview project={project} />
        </section>
        <div className="mt-8 flex justify-end">
          <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
            <a
              href={`/project/${project.id}/interview`}
              onClick={() => updateProject(project.id, { stage: "INTERVIEWING" })}
            >
              인터뷰 시작
              <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </StageScroll>
    </StageShell>
  );
}

function ProjectPreview({ project }: { readonly project: DeckProject }) {
  return (
    <section className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">미리보기</div>
      <div className="mt-3">
        <ProjectDeckThumbnail project={project} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <PreviewStat label="비율" value={project.aspectRatio} />
        <PreviewStat label="언어" value={project.language.toUpperCase()} />
        <PreviewStat label="분량" value={`${project.slideCount}장`} />
      </div>
    </section>
  );
}

function PreviewStat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-border bg-background px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function stageLabel(stage: DeckProject["stage"]): string {
  return stage
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
