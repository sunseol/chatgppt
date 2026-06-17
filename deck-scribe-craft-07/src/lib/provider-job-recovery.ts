import type { StepKey } from "./deck-types";
import { STEPS } from "./deck-types";
import type { ProviderCapability } from "./provider-types";
import { ProviderCapabilities } from "./provider-types";
import type { ProviderJob, ProviderJobProgress, ProviderJobStatus } from "./provider-job-manager";

export type ProviderJobRecoverySnapshot = {
  readonly projectId: string;
  readonly step: StepKey;
  readonly currentJobId: string;
  readonly jobs: readonly ProviderJob[];
};

const JOB_STATUSES: readonly ProviderJobStatus[] = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
];

export function providerJobRecoveryKey(projectId: string, step: StepKey): string {
  return `deckforge.provider.jobs.v1.${projectId}.${step}`;
}

export function serializeProviderJobRecoverySnapshot(
  snapshot: ProviderJobRecoverySnapshot,
): string {
  return JSON.stringify(snapshot);
}

export function parseProviderJobRecoverySnapshot(
  raw: string | null,
): ProviderJobRecoverySnapshot | undefined {
  if (raw === null) return undefined;
  const value = parseJson(raw);
  if (!isRecord(value)) return undefined;
  const projectId = value["projectId"];
  const step = value["step"];
  const currentJobId = value["currentJobId"];
  const jobs = value["jobs"];
  if (!isString(projectId) || !isStepKey(step) || !isString(currentJobId) || !Array.isArray(jobs)) {
    return undefined;
  }
  const parsedJobs = jobs.filter(isProviderJob);
  if (parsedJobs.length === 0) return undefined;
  return { projectId, step, currentJobId, jobs: parsedJobs };
}

export function findRecoveredProviderJob(
  snapshot: ProviderJobRecoverySnapshot,
  jobId: string,
): ProviderJob | undefined {
  return snapshot.jobs.find((job) => job.id === jobId);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function isProviderJob(value: unknown): value is ProviderJob {
  if (!isRecord(value)) return false;
  return (
    isString(value["id"]) &&
    isString(value["providerId"]) &&
    isCapability(value["capability"]) &&
    isString(value["description"]) &&
    isStatus(value["status"]) &&
    isNumber(value["createdAt"]) &&
    isNumber(value["attempt"]) &&
    isBoolean(value["cancelRequested"]) &&
    optionalNumber(value["startedAt"]) &&
    optionalNumber(value["finishedAt"]) &&
    optionalNumber(value["timeoutMs"]) &&
    optionalNumber(value["timeoutAt"]) &&
    optionalProgress(value["progress"]) &&
    optionalString(value["errorMessage"])
  );
}

function optionalProgress(value: unknown): value is ProviderJobProgress | undefined {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return isNumber(value["percent"]) && isString(value["message"]);
}

function optionalNumber(value: unknown): boolean {
  return value === undefined || isNumber(value);
}

function optionalString(value: unknown): boolean {
  return value === undefined || isString(value);
}

function isStatus(value: unknown): value is ProviderJobStatus {
  return isString(value) && JOB_STATUSES.some((status) => status === value);
}

function isCapability(value: unknown): value is ProviderCapability {
  return isString(value) && ProviderCapabilities.some((capability) => capability === value);
}

function isStepKey(value: unknown): value is StepKey {
  return isString(value) && STEPS.some((step) => step.key === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}
