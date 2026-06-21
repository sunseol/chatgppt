import type { ProviderImageBillingDisclosure, ProviderUsageSummary } from "./provider-job-manager";
import type { ProviderKind } from "./provider-types";
import { usageStageIdentityIssues } from "./live-usage-stage-identity";
import { hasConfirmedCodexImageBillingDisclosure } from "./live-usage-billing-evidence";
export { formatLiveUsageSummary } from "./live-usage-summary-format";

export type LiveCostLabel = "actual" | "estimate" | "hidden";

export type LiveImageBillingDisclosure = ProviderImageBillingDisclosure;

export type LiveUsageStageSummary = {
  readonly stageId: string;
  readonly providerKind: ProviderKind;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly providerUsageProvided: boolean;
  readonly usage?: ProviderUsageSummary;
  readonly costLabel: LiveCostLabel;
  readonly imageBillingDisclosure?: LiveImageBillingDisclosure;
};

export type LiveUsageSummaryIssueCode =
  | "missing_usage_stage_identity"
  | "noncanonical_usage_stage_identity"
  | "duplicate_usage_stage_identity"
  | "invalid_usage_provider_kind"
  | "missing_provider_usage_summary"
  | "incomplete_text_token_usage"
  | "missing_image_usage_count"
  | "invalid_usage_amount"
  | "invalid_duration"
  | "invalid_retry_count"
  | "invalid_cost_amount"
  | "invalid_cost_label"
  | "unlabelled_estimated_cost"
  | "estimated_cost_marked_actual"
  | "missing_image_billing_confirmation";

export type LiveUsageSummaryIssue = {
  readonly code: LiveUsageSummaryIssueCode;
  readonly stageId: string;
  readonly message: string;
};

export type LiveUsageSummaryResult =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveUsageSummaryIssue[] };

export function evaluateLiveUsageSummary(
  stages: readonly LiveUsageStageSummary[],
): LiveUsageSummaryResult {
  const issues = [
    ...usageStageIdentityIssues(stages),
    ...stages.flatMap((stage) => [
      ...providerUsageIssues(stage),
      ...providerSpecificUsageIssues(stage),
      ...usageAmountIssues(stage),
      ...durationIssues(stage),
      ...retryIssues(stage),
      ...costAmountIssues(stage),
      ...costLabelIssues(stage),
      ...imageBillingIssues(stage),
    ]),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

function providerUsageIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  return stage.providerUsageProvided &&
    (stage.usage === undefined || !usageSummaryHasUsageEvidence(stage.usage))
    ? [
        issue(
          "missing_provider_usage_summary",
          stage,
          "Provider usage or cost fields must be recorded when supplied.",
        ),
      ]
    : [];
}

function usageSummaryHasUsageEvidence(usage: ProviderUsageSummary): boolean {
  return (
    usage.inputTokens !== undefined ||
    usage.outputTokens !== undefined ||
    usage.imageCount !== undefined ||
    usage.estimatedCostUsd !== undefined
  );
}

function providerSpecificUsageIssues(
  stage: LiveUsageStageSummary,
): readonly LiveUsageSummaryIssue[] {
  const hasUsageSignal = stage.usage !== undefined && usageSummaryHasUsageEvidence(stage.usage);
  if (!hasUsageSignal) return [];

  return [
    ...(isCodexTextStage(stage) && !hasCompleteTextTokenUsage(stage.usage)
      ? [
          issue(
            "incomplete_text_token_usage",
            stage,
            "Codex usage summaries require both input and output token counts.",
          ),
        ]
      : []),
    ...(isImageGenerationStage(stage) && stage.usage?.imageCount === undefined
      ? [issue("missing_image_usage_count", stage, "Image usage summaries require an image count.")]
      : []),
  ];
}

function isCodexTextStage(stage: LiveUsageStageSummary): boolean {
  return stage.providerKind === "codex" && !isImageGenerationStage(stage);
}

function hasCompleteTextTokenUsage(usage: ProviderUsageSummary | undefined): boolean {
  return usage?.inputTokens !== undefined && usage.outputTokens !== undefined;
}

function usageAmountIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  const usage = stage.usage;
  if (usage === undefined) return [];
  return validUsageAmount(usage.inputTokens) &&
    validUsageAmount(usage.outputTokens) &&
    validUsageAmount(usage.imageCount)
    ? []
    : [issue("invalid_usage_amount", stage, "Usage amounts must be non-negative integers.")];
}

function durationIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  return Number.isFinite(stage.durationMs) && stage.durationMs > 0
    ? []
    : [issue("invalid_duration", stage, "Stage duration must be a positive observed value.")];
}

function retryIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  return Number.isInteger(stage.retryCount) && stage.retryCount >= 0
    ? []
    : [issue("invalid_retry_count", stage, "Retry count must be a non-negative integer.")];
}

function costAmountIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  const cost = stage.usage?.estimatedCostUsd;
  return cost === undefined || (Number.isFinite(cost) && cost >= 0)
    ? []
    : [issue("invalid_cost_amount", stage, "Cost amounts must be finite and non-negative.")];
}

function costLabelIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  if (stage.usage?.estimatedCostUsd === undefined) return [];
  if (!isLiveCostLabel(stage.costLabel)) {
    return [
      issue("invalid_cost_label", stage, "Cost labels must be one of actual, estimate, or hidden."),
    ];
  }
  return [
    ...(stage.costLabel === "hidden"
      ? [
          issue(
            "unlabelled_estimated_cost",
            stage,
            "Estimated or exact cost must be labelled when displayed.",
          ),
        ]
      : []),
    ...(stage.costLabel === "actual"
      ? [
          issue(
            "estimated_cost_marked_actual",
            stage,
            "Estimated provider costs must not be displayed as exact charges.",
          ),
        ]
      : []),
  ];
}

function imageBillingIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  if (!isImageGenerationStage(stage)) return [];
  const disclosure = imageBillingDisclosure(stage);
  return hasConfirmedCodexImageBillingDisclosure(disclosure)
    ? []
    : [
        issue(
          "missing_image_billing_confirmation",
          stage,
          "Image generation requires visible Codex usage confirmation.",
        ),
      ];
}

function isImageGenerationStage(stage: LiveUsageStageSummary): boolean {
  return (
    stage.providerKind === "openaiImage" ||
    stage.usage?.imageCount !== undefined ||
    imageBillingDisclosure(stage) !== undefined
  );
}

function isLiveCostLabel(value: unknown): value is LiveCostLabel {
  return value === "actual" || value === "estimate" || value === "hidden";
}

function imageBillingDisclosure(
  stage: LiveUsageStageSummary,
): LiveImageBillingDisclosure | undefined {
  return stage.imageBillingDisclosure ?? stage.usage?.imageBillingDisclosure;
}

function validUsageAmount(amount: number | undefined): boolean {
  return amount === undefined || (Number.isInteger(amount) && amount >= 0);
}

function issue(
  code: LiveUsageSummaryIssueCode,
  stage: LiveUsageStageSummary,
  message: string,
): LiveUsageSummaryIssue {
  return { code, stageId: stage.stageId, message };
}
