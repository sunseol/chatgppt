import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
import { useProject } from "@/lib/deck-store";
import { Stepper } from "@/components/deck/Stepper";
import {
  ProjectStage, InterviewStage, ResearchStage, PlanStage, DesignStage,
  LayoutStage, GenerateStage, ReviewStage, VectorizeStage, EditorStage, ExportStage,
} from "@/components/deck/stages";
import type { StepKey } from "@/lib/deck-types";
import { ChevronLeft } from "lucide-react";

const VALID_STEPS: StepKey[] = [
  "project", "interview", "research", "plan", "design", "layout",
  "generate", "review", "vectorize", "editor", "export",
];

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

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-2xl">프로젝트를 찾을 수 없습니다</div>
          <Link to="/" className="mt-4 inline-block text-sm text-accent underline">홈으로</Link>
        </div>
      </div>
    );
  }

  if (!VALID_STEPS.includes(step as StepKey)) {
    return <Navigate to="/project/$projectId/$step" params={{ projectId, step: "project" }} />;
  }

  return (
    <div className="grid min-h-screen grid-cols-[280px_1fr] bg-background">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-border bg-paper">
        <div className="border-b border-border px-4 py-4">
          <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3 w-3" /> 프로젝트 목록
          </Link>
          <div className="truncate font-serif text-base">{project.name}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {project.aspectRatio} · {project.slideCount}장
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <Stepper project={project} />
        </div>
        <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          <div>승인 {project.approvalLog.length}건</div>
          <div className="mt-1 font-mono">{project.stage}</div>
        </div>
      </aside>
      <main className="min-h-screen">
        {step === "project" && <ProjectStage project={project} />}
        {step === "interview" && <InterviewStage project={project} />}
        {step === "research" && <ResearchStage project={project} />}
        {step === "plan" && <PlanStage project={project} />}
        {step === "design" && <DesignStage project={project} />}
        {step === "layout" && <LayoutStage project={project} />}
        {step === "generate" && <GenerateStage project={project} />}
        {step === "review" && <ReviewStage project={project} />}
        {step === "vectorize" && <VectorizeStage project={project} />}
        {step === "editor" && <EditorStage project={project} />}
        {step === "export" && <ExportStage project={project} />}
      </main>
    </div>
  );
}
