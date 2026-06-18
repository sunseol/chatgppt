import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="mt-3 overflow-hidden border border-border bg-background">
        <div className="aspect-video p-5">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="h-1 w-12 bg-accent" />
              <h2 className="mt-5 line-clamp-2 font-serif text-2xl leading-tight">
                {project.name}
              </h2>
              <p className="mt-3 line-clamp-4 text-sm text-muted-foreground">
                {project.initialPrompt}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>{project.aspectRatio}</span>
              <span>{project.slideCount}장</span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        인터뷰를 시작하면 이 요청을 바탕으로 목적, 청중, 포함할 내용을 정리합니다.
      </p>
    </section>
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
