import type { DeckProject, StepKey } from "@/lib/deck-types";
import { DesignStage } from "@/components/deck/DesignStage";
import { EditorStage } from "@/components/deck/EditorStage";
import { ExportStage } from "@/components/deck/ExportStage";
import { GenerateStage } from "@/components/deck/GenerateStage";
import { InterviewStage } from "@/components/deck/InterviewStage";
import { LayoutStage } from "@/components/deck/LayoutStage";
import { PlanStage } from "@/components/deck/PlanStage";
import { ProjectStage } from "@/components/deck/ProjectStage";
import { ResearchStage } from "@/components/deck/ResearchStage";
import { ReviewStage } from "@/components/deck/ReviewStage";
import { VectorizeStage } from "@/components/deck/VectorizeStage";

export type WorkflowStageProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
};

export function DevelopmentWorkflowStage({ project, step }: WorkflowStageProps) {
  switch (step) {
    case "project":
      return <ProjectStage project={project} />;
    case "interview":
      return <InterviewStage project={project} />;
    case "research":
      return <ResearchStage project={project} />;
    case "plan":
      return <PlanStage project={project} />;
    case "design":
      return <DesignStage project={project} />;
    case "layout":
      return <LayoutStage project={project} />;
    case "generate":
      return <GenerateStage project={project} />;
    case "review":
      return <ReviewStage project={project} />;
    case "vectorize":
      return <VectorizeStage project={project} />;
    case "editor":
      return <EditorStage project={project} />;
    case "export":
      return <ExportStage project={project} />;
    default:
      return assertNever(step);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled workflow step: ${String(value)}`);
}
