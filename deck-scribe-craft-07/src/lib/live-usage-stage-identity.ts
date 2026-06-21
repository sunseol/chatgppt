import type { ProviderKind } from "./provider-types";
import type {
  LiveUsageStageSummary,
  LiveUsageSummaryIssue,
  LiveUsageSummaryIssueCode,
} from "./live-usage-summary";

const LIVE_USAGE_PROVIDER_KINDS = ["codex", "openaiImage", "local", "mock"] as const;

export function usageStageIdentityIssues(
  stages: readonly LiveUsageStageSummary[],
): readonly LiveUsageSummaryIssue[] {
  return [
    ...stages
      .filter((stage) => stage.stageId.trim().length === 0)
      .map((stage) =>
        issue(
          "missing_usage_stage_identity",
          stage,
          "Usage summary stages require a displayable stage id.",
        ),
      ),
    ...stages
      .filter((stage) => stage.stageId.trim().length > 0 && stage.stageId !== stage.stageId.trim())
      .map((stage) =>
        issue(
          "noncanonical_usage_stage_identity",
          stage,
          "Usage summary stage ids must be canonical before display or gate checks.",
        ),
      ),
    ...duplicateStageIssues(stages),
    ...stages
      .filter((stage) => !isProviderKind(stage.providerKind))
      .map((stage) =>
        issue(
          "invalid_usage_provider_kind",
          stage,
          "Usage summary providers must match the DeckForge provider taxonomy.",
        ),
      ),
  ];
}

function duplicateStageIssues(
  stages: readonly LiveUsageStageSummary[],
): readonly LiveUsageSummaryIssue[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const stage of stages) {
    const stageId = stage.stageId.trim();
    if (stageId.length === 0) continue;
    if (seen.has(stageId)) duplicates.add(stageId);
    seen.add(stageId);
  }
  return Array.from(duplicates).map((stageId) => ({
    code: "duplicate_usage_stage_identity",
    stageId,
    message: "Usage summary stages must not repeat a stage id.",
  }));
}

function isProviderKind(value: unknown): value is ProviderKind {
  return LIVE_USAGE_PROVIDER_KINDS.some((providerKind) => providerKind === value);
}

function issue(
  code: LiveUsageSummaryIssueCode,
  stage: LiveUsageStageSummary,
  message: string,
): LiveUsageSummaryIssue {
  return { code, stageId: stage.stageId.trim() || "missing", message };
}
