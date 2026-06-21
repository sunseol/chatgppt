import type { CodexAppServerJsonRpcNotification } from "./codex-app-server-event-mapper";
import type { LiveCostLabel, LiveUsageStageSummary } from "./live-usage-summary";
import type { ProviderImageBillingDisclosure, ProviderUsageSummary } from "./provider-job-manager";

export type CodexAppServerUsageStageSummaryInput = {
  readonly stageId: string;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly notifications: readonly CodexAppServerJsonRpcNotification[];
};

export function createCodexAppServerUsageStageSummary(
  input: CodexAppServerUsageStageSummaryInput,
): LiveUsageStageSummary {
  const usageNotification = latestTokenUsageNotification(input.notifications);
  const usage =
    usageNotification === undefined ? undefined : providerUsageSummary(usageNotification);
  return {
    stageId: input.stageId,
    providerKind: "codex",
    durationMs: input.durationMs,
    retryCount: input.retryCount,
    providerUsageProvided: usageNotification !== undefined,
    ...(usage === undefined ? {} : { usage }),
    costLabel: costLabelFor(usage),
  };
}

function latestTokenUsageNotification(
  notifications: readonly CodexAppServerJsonRpcNotification[],
): CodexAppServerJsonRpcNotification | undefined {
  for (let index = notifications.length - 1; index >= 0; index -= 1) {
    const notification = notifications[index];
    if (notification?.method === "thread/tokenUsage/updated") return notification;
  }
  return undefined;
}

function providerUsageSummary(
  notification: CodexAppServerJsonRpcNotification,
): ProviderUsageSummary | undefined {
  const params = asRecord(notification.params);
  const tokenUsage = params ? asRecord(params["tokenUsage"]) : undefined;
  const total = tokenUsage ? asRecord(tokenUsage["total"]) : undefined;
  const supplied = params
    ? (asRecord(params["usageSummary"]) ?? asRecord(params["usage"]))
    : undefined;
  if (!total && !supplied) return undefined;

  const inputTokens = optionalNumberField("inputTokens", supplied, total);
  const outputTokens = optionalNumberField("outputTokens", supplied, total);
  const imageCount = optionalNumberField("imageCount", supplied);
  const estimatedCostUsd = optionalNumberField("estimatedCostUsd", supplied);
  const imageBillingDisclosure = imageBillingDisclosureField(supplied);
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    imageCount === undefined &&
    estimatedCostUsd === undefined
  ) {
    return undefined;
  }
  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(imageCount === undefined ? {} : { imageCount }),
    ...(estimatedCostUsd === undefined ? {} : { estimatedCostUsd }),
    ...(imageBillingDisclosure === undefined ? {} : { imageBillingDisclosure }),
  };
}

function costLabelFor(usage: ProviderUsageSummary | undefined): LiveCostLabel {
  return usage?.estimatedCostUsd === undefined ? "hidden" : "estimate";
}

function optionalNumberField(
  key: string,
  primary: Readonly<Record<string, unknown>> | undefined,
  fallback?: Readonly<Record<string, unknown>>,
): number | undefined {
  return numberField(primary, key) ?? numberField(fallback, key);
}

function numberField(
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
): number | undefined {
  if (record === undefined || !(key in record)) return undefined;
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

function imageBillingDisclosureField(
  record: Readonly<Record<string, unknown>> | undefined,
): ProviderImageBillingDisclosure | undefined {
  const disclosure = record ? asRecord(record["imageBillingDisclosure"]) : undefined;
  if (disclosure === undefined) return undefined;
  const apiKeyRequired = booleanField(disclosure, "apiKeyRequired");
  const userConfirmed = booleanField(disclosure, "userConfirmed");
  const label = stringField(disclosure, "label");
  if (apiKeyRequired === undefined || userConfirmed === undefined || label === undefined) {
    return undefined;
  }
  const confirmationEvidencePath = stringField(disclosure, "confirmationEvidencePath");
  return {
    apiKeyRequired,
    userConfirmed,
    label,
    ...(confirmationEvidencePath === undefined ? {} : { confirmationEvidencePath }),
  };
}

function booleanField(record: Readonly<Record<string, unknown>>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function stringField(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
