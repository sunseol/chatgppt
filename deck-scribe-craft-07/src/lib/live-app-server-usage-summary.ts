import type { CodexAppServerJsonRpcNotification } from "./codex-app-server-event-mapper";
import type { LiveUsageStageSummary } from "./live-usage-summary";
import type { ProviderUsageSummary } from "./provider-job-manager";

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
  return {
    stageId: input.stageId,
    providerKind: "codex",
    durationMs: input.durationMs,
    retryCount: input.retryCount,
    providerUsageProvided: usageNotification !== undefined,
    usage: usageNotification === undefined ? undefined : providerUsageSummary(usageNotification),
    costLabel: "hidden",
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
  if (!total) return undefined;

  const inputTokens = numberField(total, "inputTokens");
  const outputTokens = numberField(total, "outputTokens");
  if (inputTokens === undefined && outputTokens === undefined) return undefined;
  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
  };
}

function numberField(record: Readonly<Record<string, unknown>>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
