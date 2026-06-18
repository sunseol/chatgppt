import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { isStepReachable, stageToStep, useProject } from "@/lib/deck-store";
import { Stepper } from "@/components/deck/Stepper";
import {
  ProductionWorkflowStage,
  type WorkflowStageProps,
} from "@/components/deck/ProductionWorkflowStage";
import type { StepKey } from "@/lib/deck-types";
import { ChevronLeft } from "lucide-react";

const VALID_STEPS: StepKey[] = [
  "project",
  "interview",
  "research",
  "plan",
  "design",
  "layout",
  "generate",
  "review",
  "vectorize",
  "editor",
  "export",
];

function isStepKey(value: string): value is StepKey {
  return VALID_STEPS.some((step) => step === value);
}

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-serif text-2xl">프로젝트 불러오는 중</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-2xl">프로젝트를 찾을 수 없습니다</div>
          <Link to="/" className="mt-4 inline-block text-sm text-accent underline">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  if (!isStepKey(step)) {
    return <Navigate to="/project/$projectId/$step" params={{ projectId, step: "project" }} />;
  }

  if (step === "vectorize") {
    return <Navigate to="/project/$projectId/$step" params={{ projectId, step: "editor" }} />;
  }

  if (!isStepReachable(project, step)) {
    return (
      <Navigate
        to="/project/$projectId/$step"
        params={{ projectId, step: stageToStep(project.stage) }}
      />
    );
  }

  return (
    <div className="grid h-screen overflow-hidden bg-background lg:grid-cols-[280px_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-border bg-paper lg:h-screen lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-4 py-4">
          <Link
            to="/"
            className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> 프로젝트 목록
          </Link>
          <div className="truncate font-serif text-base">{project.name}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {project.aspectRatio} · {project.slideCount}장
          </div>
        </div>
        <div className="desktop-scroll flex-1 py-3">
          <Stepper project={project} />
        </div>
        <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          <div>승인 {project.approvalLog.length}건</div>
          <div className="mt-1 font-mono">{project.stage}</div>
        </div>
      </aside>
      <main className="min-h-0 min-w-0 overflow-hidden">
        <WorkflowStage project={project} step={step} />
      </main>
    </div>
  );
}

function WorkflowStage(props: WorkflowStageProps) {
  if (import.meta.env.PROD) return <ProductionWorkflowStage {...props} />;
  return <DevelopmentWorkflowStageLoader {...props} />;
}

function DevelopmentWorkflowStageLoader(props: WorkflowStageProps) {
  const [Component, setComponent] = useState<ComponentType<WorkflowStageProps>>();

  useEffect(() => {
    let mounted = true;
    void import("@/components/deck/DevelopmentWorkflowStage").then((module) => {
      if (mounted) setComponent(() => module.DevelopmentWorkflowStage);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (Component === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-serif text-2xl">워크플로 불러오는 중</div>
      </div>
    );
  }

  return <Component {...props} />;
}
