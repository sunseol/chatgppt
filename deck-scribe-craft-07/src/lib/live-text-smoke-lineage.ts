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
  return [
    ...initialPromptInputIssues(artifacts),
    ...answerInputIssues(artifacts),
    ...researchInputIssues(artifacts),
    ...LINEAGE_REQUIREMENTS.flatMap((requirement) =>
      lineageIssueForRequirement(artifacts, requirement),
    ),
  ];
}

function initialPromptInputIssues(
  artifacts: readonly LiveTextSmokeArtifact[],
): readonly LiveTextSmokeIssue[] {
  const artifact = artifactForStage(artifacts, "questions");
  if (artifact === undefined || artifact.provenance.inputArtifactIds.some(hasText)) return [];

  return [
    {
      code: "text_smoke_missing_initial_prompt_input",
      stage: "questions",
      artifactId: artifact.provenance.artifactId,
      message: "Live text smoke questions artifact must cite the project or initial prompt input.",
    },
  ];
}

function answerInputIssues(
  artifacts: readonly LiveTextSmokeArtifact[],
): readonly LiveTextSmokeIssue[] {
  const questionArtifact = artifactForStage(artifacts, "questions");
  const briefArtifact = artifactForStage(artifacts, "brief");
  if (questionArtifact === undefined || briefArtifact === undefined) return [];

  const questionArtifactId = questionArtifact.provenance.artifactId;
  const hasAnswerInput = briefArtifact.provenance.inputArtifactIds
    .map((inputId) => inputId.trim())
    .some((inputId) => inputId.length > 0 && inputId !== questionArtifactId);
  if (hasAnswerInput) return [];

  return [
    {
      code: "text_smoke_missing_answer_input",
      stage: "brief",
      artifactId: briefArtifact.provenance.artifactId,
      message: "Live text smoke Brief artifact must cite the user answer bundle input.",
    },
  ];
}

function researchInputIssues(
  artifacts: readonly LiveTextSmokeArtifact[],
): readonly LiveTextSmokeIssue[] {
  const briefArtifact = artifactForStage(artifacts, "brief");
  const deckPlanArtifact = artifactForStage(artifacts, "deck_plan");
  if (briefArtifact === undefined || deckPlanArtifact === undefined) return [];

  const briefArtifactId = normalizedIdentity(briefArtifact.provenance.artifactId);
  const hasResearchInput = deckPlanArtifact.provenance.inputArtifactIds
    .map(normalizedIdentity)
    .some((inputId) => inputId !== undefined && inputId !== briefArtifactId);
  if (hasResearchInput) return [];

  return [
    {
      code: "text_smoke_missing_research_input",
      stage: "deck_plan",
      artifactId: deckPlanArtifact.provenance.artifactId,
      message:
        "Live text smoke Deck Plan artifact must cite the approved Research Pack input separately from Brief.",
    },
  ];
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

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function normalizedIdentity(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
