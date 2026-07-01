import type { ProviderUsageSummary } from "./provider-job-manager";
import type { ProviderKind } from "./provider-types";

export type LiveCostLabel = "actual" | "estimate" | "hidden";

export type LiveImageBillingDisclosure = {
  readonly apiKeyRequired: boolean;
  readonly userConfirmed: boolean;
  readonly label: string;
};

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
  | "missing_provider_usage_summary"
  | "invalid_duration"
  | "invalid_retry_count"
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
  const issues = stages.flatMap((stage) => [
    ...providerUsageIssues(stage),
    ...durationIssues(stage),
    ...retryIssues(stage),
    ...costLabelIssues(stage),
    ...imageBillingIssues(stage),
  ]);
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function formatLiveUsageSummary(stages: readonly LiveUsageStageSummary[]): string {
  return [
    "# DF-244 Live Usage Summary",
    ...stages.map(
      (stage) =>
        `${stage.stageId} · ${stage.providerKind} · ${stage.durationMs}ms · retries ${stage.retryCount}${usageText(stage)}${billingText(stage)}`,
    ),
  ].join("\n");
}

function providerUsageIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  return stage.providerUsageProvided && stage.usage === undefined
    ? [
        issue(
          "missing_provider_usage_summary",
          stage,
          "Provider usage or cost must be recorded when supplied.",
        ),
      ]
    : [];
}

function durationIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  return Number.isFinite(stage.durationMs) && stage.durationMs >= 0
    ? []
    : [issue("invalid_duration", stage, "Stage duration must be non-negative.")];
}

function retryIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  return Number.isInteger(stage.retryCount) && stage.retryCount >= 0
    ? []
    : [issue("invalid_retry_count", stage, "Retry count must be a non-negative integer.")];
}

function costLabelIssues(stage: LiveUsageStageSummary): readonly LiveUsageSummaryIssue[] {
  if (stage.usage?.estimatedCostUsd === undefined) return [];
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
  const disclosure = stage.imageBillingDisclosure;
  return disclosure?.userConfirmed === true && disclosure.label.trim().length > 0
    ? []
    : [
        issue(
          "missing_image_billing_confirmation",
          stage,
          "Image generation requires visible billing/API key confirmation.",
        ),
      ];
}

function isImageGenerationStage(stage: LiveUsageStageSummary): boolean {
  return (
    stage.providerKind === "openaiImage" ||
    stage.stageId === "generate" ||
    stage.usage?.imageCount !== undefined
  );
}

function usageText(stage: LiveUsageStageSummary): string {
  const usage = stage.usage;
  if (usage === undefined) return "";
  const parts = [
    usage.inputTokens === undefined ? "" : `input ${usage.inputTokens}`,
    usage.outputTokens === undefined ? "" : `output ${usage.outputTokens}`,
    usage.imageCount === undefined ? "" : `images ${usage.imageCount}`,
    costText(stage),
  ].filter((part) => part.length > 0);
  return parts.length === 0 ? "" : ` · ${parts.join(" · ")}`;
}

function costText(stage: LiveUsageStageSummary): string {
  const cost = stage.usage?.estimatedCostUsd;
  if (cost === undefined || stage.costLabel === "hidden") return "";
  const label = stage.costLabel === "actual" ? "cost" : "cost estimate";
  return `${label} $${cost.toFixed(4)}`;
}

function billingText(stage: LiveUsageStageSummary): string {
  const label = stage.imageBillingDisclosure?.label;
  return label === undefined || label.trim().length === 0 ? "" : ` · ${label}`;
}

function issue(
  code: LiveUsageSummaryIssueCode,
  stage: LiveUsageStageSummary,
  message: string,
): LiveUsageSummaryIssue {
  return { code, stageId: stage.stageId, message };
}
