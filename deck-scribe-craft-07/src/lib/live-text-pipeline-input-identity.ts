import type {
  LiveTextPipelineCutoverInput,
  LiveTextPipelineIssue,
  LiveTextPipelineStage,
} from "./live-text-pipeline-cutover";

export function inputArtifactIdentityIssues(
  input: LiveTextPipelineCutoverInput,
): readonly LiveTextPipelineIssue[] {
  return [
    ...inputArtifactIdentityIssue("deck_plan", input.deckPlan.provenance.artifactId, [
      input.approvedBriefArtifactId,
      input.approvedResearchPackArtifactId,
      ...input.deckPlan.provenance.inputArtifactIds,
    ]),
    ...inputArtifactIdentityIssue(
      "design_system",
      input.designSystem.provenance.artifactId,
      input.designSystem.provenance.inputArtifactIds,
    ),
    ...inputArtifactIdentityIssue(
      "layout_ir",
      input.layoutIr.provenance.artifactId,
      input.layoutIr.provenance.inputArtifactIds,
    ),
  ];
}

function inputArtifactIdentityIssue(
  stage: LiveTextPipelineStage,
  artifactId: string,
  inputArtifactIds: readonly string[],
): readonly LiveTextPipelineIssue[] {
  return inputArtifactIds.some((inputArtifactId) => isNonCanonicalNonBlank(inputArtifactId))
    ? [
        {
          code: "noncanonical_text_pipeline_input_identity",
          stage,
          artifactId,
          message: "Text pipeline input artifact ids must be canonical.",
        },
      ]
    : [];
}

function isNonCanonicalNonBlank(value: string): boolean {
  return value.trim() !== "" && value !== value.trim();
}
