import type { LiveTextProductionStage } from "./live-text-production-workflow";
import type { LiveTextSmokeArtifact, LiveTextSmokeIssue } from "./live-text-smoke-gate";

const PROMPT_VERSIONS_BY_STAGE: Record<LiveTextProductionStage, readonly string[]> = {
  questions: ["interview_questions@v1", "interview_questions_desktop@v1"],
  brief: ["interview_brief@v1"],
  deck_plan: ["deck_plan@v1", "deck_plan_desktop@v1"],
  design_system: ["design_system@v1", "design_system_desktop@v1"],
  layout_ir: ["layout_ir@v1", "layout_ir_desktop@v1"],
} as const;

export function textSmokePromptLineageIssues(
  artifacts: readonly LiveTextSmokeArtifact[],
): readonly LiveTextSmokeIssue[] {
  return artifacts.flatMap((artifact) => {
    const expectedPromptVersions = PROMPT_VERSIONS_BY_STAGE[artifact.stage];
    if (expectedPromptVersions.includes(artifact.provenance.promptVersion)) return [];

    return [
      {
        code: "text_smoke_prompt_version_mismatch" as const,
        stage: artifact.stage,
        artifactId: artifact.provenance.artifactId,
        message: `Live text smoke ${artifact.stage} artifact must use ${expectedPromptVersions.join(
          " or ",
        )}.`,
      },
    ];
  });
}
