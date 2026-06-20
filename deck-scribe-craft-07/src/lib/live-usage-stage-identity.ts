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
