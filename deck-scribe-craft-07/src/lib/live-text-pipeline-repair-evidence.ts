import type {
  LiveTextPipelineCutoverInput,
  LiveTextPipelineIssue,
  LiveTextPipelineRepairAttempt,
  LiveTextPipelineStage,
} from "./live-text-pipeline-cutover";

export function repairTurnEvidenceIssues(
  input: LiveTextPipelineCutoverInput,
  stage: LiveTextPipelineStage,
): readonly LiveTextPipelineIssue[] {
  const failedTurnId = originalTurnIdForStage(input, stage);
  const seenTurnIds = new Set<string>();
  return input.repairAttempts
    .filter((attempt) => attempt.stage === stage)
    .flatMap((attempt) => repairAttemptIssues(stage, failedTurnId, seenTurnIds, attempt));
}

function repairAttemptIssues(
  stage: LiveTextPipelineStage,
  failedTurnId: string | undefined,
  seenTurnIds: Set<string>,
  attempt: LiveTextPipelineRepairAttempt,
): readonly LiveTextPipelineIssue[] {
  const turnId = attempt.turnId.trim();
  const issues = [
    ...(turnId.length > 0
      ? []
      : [issue(stage, "Schema repair evidence must include the live repair turn id.")]),
    ...(turnId.length > 0 && turnId === failedTurnId
      ? [issue(stage, "Schema repair evidence must use a fresh turn after the failed output.")]
      : []),
    ...(turnId.length > 0 && seenTurnIds.has(turnId)
      ? [issue(stage, "Schema repair evidence must not reuse a repair turn id.")]
      : []),
  ];

  if (turnId.length > 0) seenTurnIds.add(turnId);
  return issues;
}

function originalTurnIdForStage(
  input: LiveTextPipelineCutoverInput,
  stage: LiveTextPipelineStage,
): string | undefined {
  switch (stage) {
    case "deck_plan":
      return input.deckPlan.provenance.turnId;
    case "design_system":
      return input.designSystem.provenance.turnId;
    case "layout_ir":
      return input.layoutIr.provenance.turnId;
    default:
      return assertNever(stage);
  }
}

function issue(stage: LiveTextPipelineStage, message: string): LiveTextPipelineIssue {
  return {
    code: "invalid_repair_turn_evidence",
    stage,
    message,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected live text pipeline stage: ${String(value)}`);
}
