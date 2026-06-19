import type { LiveTextProductionStage } from "./live-text-production-workflow";
import type { LiveTextSmokeArtifact, LiveTextSmokeIssue } from "./live-text-smoke-gate";

type LineageRequirement = {
  readonly stage: LiveTextProductionStage;
  readonly inputs: readonly LiveTextProductionStage[];
};

const LINEAGE_REQUIREMENTS = [
  { stage: "brief", inputs: ["questions"] },
  { stage: "deck_plan", inputs: ["brief"] },
  { stage: "design_system", inputs: ["deck_plan"] },
  { stage: "layout_ir", inputs: ["deck_plan", "design_system"] },
] as const satisfies readonly LineageRequirement[];

export function textPathLineageIssues(
  artifacts: readonly LiveTextSmokeArtifact[],
): readonly LiveTextSmokeIssue[] {
  return LINEAGE_REQUIREMENTS.flatMap((requirement) =>
    lineageIssueForRequirement(artifacts, requirement),
  );
}

function lineageIssueForRequirement(
  artifacts: readonly LiveTextSmokeArtifact[],
  requirement: LineageRequirement,
): readonly LiveTextSmokeIssue[] {
  const artifact = artifactForStage(artifacts, requirement.stage);
  if (artifact === undefined) return [];

  const missingStages = requirement.inputs.filter((stage) => {
    const inputArtifact = artifactForStage(artifacts, stage);
    return (
      inputArtifact === undefined ||
      !artifact.provenance.inputArtifactIds.includes(inputArtifact.provenance.artifactId)
    );
  });

  if (missingStages.length === 0) return [];

  return [
    {
      code: "disconnected_text_stage_lineage",
      stage: requirement.stage,
      artifactId: artifact.provenance.artifactId,
      message: `Live text smoke ${requirement.stage} artifact must cite ${missingStages.join(
        ", ",
      )} input lineage.`,
    },
  ];
}

function artifactForStage(
  artifacts: readonly LiveTextSmokeArtifact[],
  stage: LiveTextProductionStage,
): LiveTextSmokeArtifact | undefined {
  return artifacts.find((artifact) => artifact.stage === stage);
}
