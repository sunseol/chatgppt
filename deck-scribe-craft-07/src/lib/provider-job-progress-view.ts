import type { ProviderJob, ProviderJobStatus, ProviderUsageSummary } from "./provider-job-manager";
import { redactSensitiveText } from "./redaction";

export type ProviderJobArtifactView = {
  readonly label: string;
  readonly artifactId?: string;
};

export type ProviderJobProgressView = {
  readonly stageLabel: string;
  readonly jobId: string;
  readonly status: ProviderJobStatus;
  readonly statusLabel: string;
  readonly percent: number;
  readonly message: string;
  readonly attemptLabel: string;
  readonly providerLabel: string;
  readonly durationLabel: string;
  readonly retryLabel: string;
  readonly usageItems: readonly string[];
  readonly canCancel: boolean;
  readonly canRetry: boolean;
  readonly recovered: boolean;
  readonly artifacts: readonly ProviderJobArtifactView[];
  readonly failureSummary?: string;
};

export function createProviderJobProgressView(input: {
  readonly stageLabel: string;
  readonly job: ProviderJob;
  readonly recovered: boolean;
}): ProviderJobProgressView {
  const progress = input.job.progress;
  const failureSummary = summarizeFailure(input.job.errorMessage);
  return {
    stageLabel: input.stageLabel,
    jobId: input.job.id,
    status: input.job.status,
    statusLabel: statusLabel(input.job.status),
    percent: clampPercent(progress?.percent ?? fallbackPercent(input.job.status)),
    message: oneLine(progress?.message ?? input.job.description),
    attemptLabel: `${input.job.attempt}회차`,
    providerLabel: input.job.providerId,
    durationLabel: durationLabel(input.job),
    retryLabel: `retries ${Math.max(0, input.job.attempt - 1)}`,
    usageItems: usageItems(input.job.usageSummary),
    canCancel:
      (input.job.status === "queued" || input.job.status === "running") &&
      !input.job.cancelRequested,
    canRetry: input.job.status === "failed" || input.job.status === "cancelled",
    recovered: input.recovered,
    artifacts: extractArtifacts(input.job.partialResult),
    ...(failureSummary === undefined ? {} : { failureSummary }),
  };
}

function statusLabel(status: ProviderJobStatus): string {
  switch (status) {
    case "queued":
      return "대기 중";
    case "running":
      return "진행 중";
    case "succeeded":
      return "완료";
    case "failed":
      return "실패";
    case "cancelled":
      return "취소됨";
    default:
      return assertNever(status);
  }
}

function fallbackPercent(status: ProviderJobStatus): number {
  switch (status) {
    case "queued":
      return 0;
    case "running":
      return 5;
    case "succeeded":
      return 100;
    case "failed":
    case "cancelled":
      return 0;
    default:
      return assertNever(status);
  }
}

function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function oneLine(text: string): string {
  const redacted = redactSensitiveText(text);
  return (
    redacted
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("at ")) ??
    "작업 상태를 확인하는 중입니다."
  );
}

function durationLabel(job: ProviderJob): string {
  if (job.startedAt === undefined) return "not started";
  if (job.finishedAt === undefined) return "running";
  const durationMs = job.finishedAt - job.startedAt;
  return Number.isFinite(durationMs) && durationMs >= 0
    ? `${Math.round(durationMs)}ms`
    : "duration unavailable";
}

function usageItems(usageSummary: ProviderUsageSummary | undefined): readonly string[] {
  if (usageSummary === undefined) return [];
  return [
    usageAmountItem("input", usageSummary.inputTokens),
    usageAmountItem("output", usageSummary.outputTokens),
    usageAmountItem("images", usageSummary.imageCount),
    costEstimateItem(usageSummary.estimatedCostUsd),
    imageBillingDisclosureItem(usageSummary),
  ].filter(isNonEmpty);
}

function usageAmountItem(label: string, amount: number | undefined): string {
  return amount === undefined || !validUsageAmount(amount) ? "" : `${label} ${amount}`;
}

function costEstimateItem(cost: number | undefined): string {
  return cost === undefined || !Number.isFinite(cost) || cost < 0
    ? ""
    : `cost estimate $${cost.toFixed(4)}`;
}

function imageBillingDisclosureItem(usageSummary: ProviderUsageSummary): string {
  const disclosure = usageSummary.imageBillingDisclosure;
  if (disclosure === undefined) return "";
  if (disclosure.apiKeyRequired && !disclosure.userConfirmed) {
    return "API key billing not confirmed";
  }
  return disclosure.label.trim();
}

function isNonEmpty(value: string): boolean {
  return value.length > 0;
}

function validUsageAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 0;
}

function summarizeFailure(errorMessage: string | undefined): string | undefined {
  if (errorMessage === undefined) return undefined;
  return `실패 요약: ${oneLine(errorMessage)}`;
}

function extractArtifacts(value: unknown): readonly ProviderJobArtifactView[] {
  if (Array.isArray(value)) return value.flatMap((item) => optionalArtifact(item));
  return optionalArtifact(value);
}

function optionalArtifact(value: unknown): readonly ProviderJobArtifactView[] {
  if (!isRecord(value)) return [];
  const label =
    stringProp(value, "label") ?? stringProp(value, "title") ?? stringProp(value, "kind");
  const artifactId = stringProp(value, "artifactId");
  if (label === undefined && artifactId === undefined) return [];
  return [
    {
      label: label ?? "중간 산출물",
      ...(artifactId === undefined ? {} : { artifactId }),
    },
  ];
}

function stringProp(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected provider job status: ${String(value)}`);
}
