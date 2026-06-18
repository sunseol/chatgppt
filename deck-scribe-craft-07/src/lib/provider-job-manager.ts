import {
  ProviderJobCancelledError,
  ProviderJobNotFoundError,
  ProviderJobRetryNotAllowedError,
  ProviderJobTimedOutError,
} from "./provider-job-types";
import type {
  EnqueueProviderJobInput,
  ProviderJob,
  ProviderJobManager,
  ProviderJobManagerOptions,
  ProviderJobProgress,
  ProviderJobRunContext,
  ProviderImageBillingDisclosure,
  ProviderUsageSummary,
} from "./provider-job-types";

export {
  ProviderJobCancelledError,
  ProviderJobNotFoundError,
  ProviderJobRetryNotAllowedError,
  ProviderJobTimedOutError,
} from "./provider-job-types";
export type {
  EnqueueProviderJobInput,
  ProviderJob,
  ProviderJobManager,
  ProviderJobManagerOptions,
  ProviderJobProgress,
  ProviderJobRunContext,
  ProviderJobStatus,
  ProviderImageBillingDisclosure,
  ProviderUsageSummary,
} from "./provider-job-types";

type RunningProviderJob = Omit<ProviderJob, "status" | "output" | "errorMessage" | "finishedAt"> & {
  readonly status: "running";
  readonly startedAt: number;
};

type ProviderJobWithoutResult = Omit<ProviderJob, "output" | "errorMessage">;

export function createProviderJobManager(
  options: ProviderJobManagerOptions = {},
): ProviderJobManager {
  const createId = options.createId ?? (() => `job_${Date.now().toString(36)}`);
  const now = options.now ?? Date.now;
  const jobs = new Map<string, ProviderJob>();
  for (const job of options.initialJobs ?? []) jobs.set(job.id, job);

  function enqueue(input: EnqueueProviderJobInput): ProviderJob {
    const createdAt = now();
    const job: ProviderJob = {
      id: createId(),
      providerId: input.providerId,
      capability: input.capability,
      description: input.description,
      status: "queued",
      createdAt,
      attempt: 1,
      cancelRequested: false,
      ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
      ...(input.timeoutMs === undefined ? {} : { timeoutAt: createdAt + input.timeoutMs }),
    };
    jobs.set(job.id, job);
    return job;
  }

  function get(jobId: string): ProviderJob | undefined {
    return jobs.get(jobId);
  }

  function requireJob(jobId: string): ProviderJob {
    const job = jobs.get(jobId);
    if (!job) throw new ProviderJobNotFoundError(jobId);
    return job;
  }

  function reportProgress(jobId: string, progress: ProviderJobProgress): ProviderJob {
    const current = requireJob(jobId);
    const updated: ProviderJob = {
      ...current,
      progress,
    };
    jobs.set(jobId, updated);
    return updated;
  }

  function recordPartialResult(jobId: string, partialResult: unknown): ProviderJob {
    const current = requireJob(jobId);
    const updated: ProviderJob = {
      ...current,
      partialResult,
    };
    jobs.set(jobId, updated);
    return updated;
  }

  function recordUsageSummary(jobId: string, usageSummary: ProviderUsageSummary): ProviderJob {
    const current = requireJob(jobId);
    const updated: ProviderJob = {
      ...current,
      usageSummary,
    };
    jobs.set(jobId, updated);
    return updated;
  }

  function requestCancellation(jobId: string): ProviderJob {
    const current = requireJob(jobId);
    const updated: ProviderJob = {
      ...current,
      cancelRequested: true,
    };
    jobs.set(jobId, updated);
    return updated;
  }

  function retry(jobId: string): ProviderJob {
    const current = requireJob(jobId);
    if (current.status !== "failed" && current.status !== "cancelled") {
      throw new ProviderJobRetryNotAllowedError(jobId);
    }

    const createdAt = now();
    const retried: ProviderJob = {
      id: current.id,
      providerId: current.providerId,
      capability: current.capability,
      description: current.description,
      status: "queued",
      createdAt,
      attempt: current.attempt + 1,
      cancelRequested: false,
      ...(current.timeoutMs === undefined ? {} : { timeoutMs: current.timeoutMs }),
      ...(current.timeoutMs === undefined ? {} : { timeoutAt: createdAt + current.timeoutMs }),
    };
    jobs.set(jobId, retried);
    return retried;
  }

  function snapshot(): readonly ProviderJob[] {
    return Array.from(jobs.values());
  }

  async function run<TOutput>(
    jobId: string,
    work: (context: ProviderJobRunContext) => Promise<TOutput>,
  ): Promise<ProviderJob<TOutput>> {
    const queued = requireJob(jobId);
    if (isTimedOut(queued)) throw new ProviderJobTimedOutError(jobId);

    const running: RunningProviderJob = {
      ...queued,
      status: "running",
      startedAt: now(),
    };
    jobs.set(jobId, running);

    const context: ProviderJobRunContext = {
      reportProgress: (progress) => reportProgress(jobId, progress),
      recordPartialResult: (partialResult) => recordPartialResult(jobId, partialResult),
      recordUsageSummary: (usageSummary) => recordUsageSummary(jobId, usageSummary),
      isCancellationRequested: () => requireJob(jobId).cancelRequested,
    };

    try {
      const output = await work(context);
      const latest = copyJobWithoutResult(requireJob(jobId));
      if (isTimedOut(latest)) throw new ProviderJobTimedOutError(jobId);
      const succeeded: ProviderJob<TOutput> = {
        ...latest,
        status: "succeeded",
        finishedAt: now(),
        output,
      };
      jobs.set(jobId, succeeded);
      return succeeded;
    } catch (error) {
      const latest = copyJobWithoutResult(requireJob(jobId));
      if (error instanceof ProviderJobCancelledError) {
        const cancelled: ProviderJob<TOutput> = {
          ...latest,
          status: "cancelled",
          finishedAt: now(),
          errorMessage: error.message,
        };
        jobs.set(jobId, cancelled);
        return cancelled;
      }

      const failed: ProviderJob<TOutput> = {
        ...latest,
        status: "failed",
        finishedAt: now(),
        errorMessage: error instanceof Error ? error.message : "Unknown provider job failure.",
      };
      jobs.set(jobId, failed);
      return failed;
    }
  }

  function isTimedOut(job: ProviderJobWithoutResult): boolean {
    return job.timeoutAt !== undefined && now() > job.timeoutAt;
  }

  return {
    enqueue,
    get,
    reportProgress,
    recordPartialResult,
    recordUsageSummary,
    requestCancellation,
    retry,
    snapshot,
    run,
  };
}

function copyJobWithoutResult(job: ProviderJob): ProviderJobWithoutResult {
  return {
    id: job.id,
    providerId: job.providerId,
    capability: job.capability,
    description: job.description,
    status: job.status,
    createdAt: job.createdAt,
    attempt: job.attempt,
    cancelRequested: job.cancelRequested,
    ...(job.startedAt === undefined ? {} : { startedAt: job.startedAt }),
    ...(job.finishedAt === undefined ? {} : { finishedAt: job.finishedAt }),
    ...(job.timeoutMs === undefined ? {} : { timeoutMs: job.timeoutMs }),
    ...(job.timeoutAt === undefined ? {} : { timeoutAt: job.timeoutAt }),
    ...(job.progress === undefined ? {} : { progress: job.progress }),
    ...(job.partialResult === undefined ? {} : { partialResult: job.partialResult }),
    ...(job.usageSummary === undefined ? {} : { usageSummary: job.usageSummary }),
  };
}
