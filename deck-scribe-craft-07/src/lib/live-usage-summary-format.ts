import type { LiveUsageStageSummary } from "./live-usage-summary";
import { hasConfirmedCodexImageBillingDisclosure } from "./live-usage-billing-evidence";
import { redactSensitiveText } from "./redaction";

export function formatLiveUsageSummary(stages: readonly LiveUsageStageSummary[]): string {
  return [
    "# DF-244 Live Usage Summary",
    ...stages.map(
      (stage) =>
        `${stage.stageId} · ${stage.providerKind} · ${stage.durationMs}ms · retries ${stage.retryCount}${usageText(stage)}${billingText(stage)}`,
    ),
  ].join("\n");
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
  if (cost === undefined || !isDisplayableCostLabel(stage.costLabel)) return "";
  const label = stage.costLabel === "actual" ? "cost" : "cost estimate";
  return `${label} $${cost.toFixed(4)}`;
}

function isDisplayableCostLabel(value: string): boolean {
  return value === "actual" || value === "estimate";
}

function billingText(stage: LiveUsageStageSummary): string {
  const disclosure = stage.imageBillingDisclosure ?? stage.usage?.imageBillingDisclosure;
  if (disclosure === undefined) return "";
  if (!hasConfirmedCodexImageBillingDisclosure(disclosure)) {
    return " · Codex image usage not confirmed";
  }
  return ` · ${redactSensitiveText(disclosure.label.trim())}`;
}
