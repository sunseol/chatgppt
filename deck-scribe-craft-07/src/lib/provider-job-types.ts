import type { ProviderCapability } from "./provider-types";

export type ProviderJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface ProviderJobProgress {
  readonly percent: number;
  readonly message: string;
}

export interface ProviderImageBillingDisclosure {
  readonly apiKeyRequired: boolean;
  readonly userConfirmed: boolean;
  readonly label: string;
  readonly confirmationEvidencePath?: string;
}

export interface ProviderUsageSummary {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly imageCount?: number;
  readonly estimatedCostUsd?: number;
  readonly imageBillingDisclosure?: ProviderImageBillingDisclosure;
}

export interface ProviderJob<TOutput = unknown> {
  readonly id: string;
  readonly providerId: string;
  readonly capability: ProviderCapability;
  readonly description: string;
  readonly status: ProviderJobStatus;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly finishedAt?: number;
  readonly attempt: number;
  readonly timeoutMs?: number;
  readonly timeoutAt?: number;
  readonly progress?: ProviderJobProgress;
  readonly cancelRequested: boolean;
  readonly partialResult?: unknown;
  readonly usageSummary?: ProviderUsageSummary;
  readonly output?: TOutput;
  readonly errorMessage?: string;
}

export interface ProviderJobManagerOptions {
  readonly createId?: () => string;
  readonly now?: () => number;
  readonly initialJobs?: readonly ProviderJob[];
}

export interface EnqueueProviderJobInput {
  readonly providerId: string;
  readonly capability: ProviderCapability;
  readonly description: string;
  readonly timeoutMs?: number;
}

export interface ProviderJobRunContext {
  reportProgress(progress: ProviderJobProgress): ProviderJob;
  recordPartialResult(partialResult: unknown): ProviderJob;
  recordUsageSummary(usageSummary: ProviderUsageSummary): ProviderJob;
  isCancellationRequested(): boolean;
}

export interface ProviderJobManager {
  enqueue(input: EnqueueProviderJobInput): ProviderJob;
  get(jobId: string): ProviderJob | undefined;
  reportProgress(jobId: string, progress: ProviderJobProgress): ProviderJob;
  recordPartialResult(jobId: string, partialResult: unknown): ProviderJob;
  recordUsageSummary(jobId: string, usageSummary: ProviderUsageSummary): ProviderJob;
  requestCancellation(jobId: string): ProviderJob;
  retry(jobId: string): ProviderJob;
  snapshot(): readonly ProviderJob[];
  run<TOutput>(
    jobId: string,
    work: (context: ProviderJobRunContext) => Promise<TOutput>,
  ): Promise<ProviderJob<TOutput>>;
}

export class ProviderJobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Provider job "${jobId}" was not found.`);
    this.name = "ProviderJobNotFoundError";
  }
}

export class ProviderJobCancelledError extends Error {
  constructor(jobId: string) {
    super(`Provider job "${jobId}" was cancelled.`);
    this.name = "ProviderJobCancelledError";
  }
}

export class ProviderJobTimedOutError extends Error {
  constructor(jobId: string) {
    super(`Provider job "${jobId}" timed out.`);
    this.name = "ProviderJobTimedOutError";
  }
}

export class ProviderJobRetryNotAllowedError extends Error {
  constructor(jobId: string) {
    super(`Provider job "${jobId}" cannot be retried from its current status.`);
    this.name = "ProviderJobRetryNotAllowedError";
  }
}
