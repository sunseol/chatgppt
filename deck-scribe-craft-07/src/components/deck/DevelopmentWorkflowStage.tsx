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
import { createDesktopLiveSlideGenerationRunnerIfAvailable } from "@/lib/desktop-openai-image";

export type WorkflowStageProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly productionLateStage?: boolean;
};

export function DevelopmentWorkflowStage({
  project,
  step,
  productionLateStage = false,
}: WorkflowStageProps) {
  const liveGenerationRunner = productionLateStage
    ? createDesktopLiveSlideGenerationRunnerIfAvailable()
    : undefined;

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
      return (
        <GenerateStage
          project={project}
          executionMode={productionLateStage ? "production" : undefined}
          runLiveGeneration={liveGenerationRunner}
        />
      );
    case "review":
      return <ReviewStage project={project} />;
    case "vectorize":
      return <VectorizeStage project={project} />;
    case "editor":
      return <EditorStage project={project} allowMockConversion={!productionLateStage} />;
    case "export":
      return (
        <ExportStage
          project={project}
          executionMode={productionLateStage ? "production" : undefined}
        />
      );
    default:
      return assertNever(step);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled workflow step: ${String(value)}`);
}
