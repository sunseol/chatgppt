import { ImageArtifactStoreError, type ImageArtifactStore } from "./image-artifact-store";
import {
  evaluateLiveImageQueueEvidence,
  type LiveImageQueueEvidenceValidation,
} from "./live-image-queue-evidence";
import type { ProviderJob } from "./provider-job-manager";
import type { SlideGenerationQueueResult } from "./slide-generation-queue";

type ReadySlideGenerationQueueResult = Extract<
  SlideGenerationQueueResult,
  { readonly kind: "ready" }
>;

export type LiveImageQueueEvidenceJob = {
  readonly id: string;
  readonly providerId: string;
  readonly capability: ProviderJob["capability"];
  readonly description: string;
  readonly status: ProviderJob["status"];
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly finishedAt?: number;
  readonly attempt: number;
  readonly progress?: ProviderJob["progress"];
  readonly cancelRequested: boolean;
  readonly usageSummary?: ProviderJob["usageSummary"];
  readonly errorMessage?: string;
};

export type LiveImageQueueEvidenceExport = {
  readonly schemaVersion: 1;
  readonly issue: "DF-233";
  readonly projectId: string;
  readonly jobId: string;
  readonly exportedAt: number;
  readonly resultStatus: ReadySlideGenerationQueueResult["status"];
  readonly context: ReadySlideGenerationQueueResult["context"];
  readonly slides: ReadySlideGenerationQueueResult["slides"];
  readonly failures: ReadySlideGenerationQueueResult["failures"];
  readonly jobs: readonly LiveImageQueueEvidenceJob[];
  readonly promptUsages: ReadySlideGenerationQueueResult["promptUsages"];
  readonly retryProvenance: ReadySlideGenerationQueueResult["retryProvenance"];
  readonly concurrency: ReadySlideGenerationQueueResult["concurrency"];
  readonly progress: ReadySlideGenerationQueueResult["progress"];
  readonly storedImageArtifactPaths: readonly string[];
  readonly validation: LiveImageQueueEvidenceValidation;
};

export type StoredLiveImageQueueEvidenceExport = {
  readonly path: string;
  readonly evidence: LiveImageQueueEvidenceExport;
};

export async function writeLiveImageQueueEvidenceExport(input: {
  readonly store: ImageArtifactStore;
  readonly projectId: string;
  readonly jobId: string;
  readonly exportedAt: number;
  readonly result: ReadySlideGenerationQueueResult;
  readonly storedImageArtifactPaths: readonly string[];
}): Promise<StoredLiveImageQueueEvidenceExport> {
  const evidence = liveImageQueueEvidenceExport(input);
  const path = liveImageQueueEvidencePath(input.projectId, input.jobId);
  await input.store.write({
    path,
    content: JSON.stringify(evidence, null, 2),
  });
  return { path, evidence };
}

function liveImageQueueEvidenceExport(input: {
  readonly projectId: string;
  readonly jobId: string;
  readonly exportedAt: number;
  readonly result: ReadySlideGenerationQueueResult;
  readonly storedImageArtifactPaths: readonly string[];
}): LiveImageQueueEvidenceExport {
  return {
    schemaVersion: 1,
    issue: "DF-233",
    projectId: input.projectId,
    jobId: input.jobId,
    exportedAt: input.exportedAt,
    resultStatus: input.result.status,
    context: input.result.context,
    slides: input.result.slides,
    failures: input.result.failures,
    jobs: input.result.jobs.map(evidenceJob),
    promptUsages: input.result.promptUsages,
    retryProvenance: input.result.retryProvenance,
    concurrency: input.result.concurrency,
    progress: input.result.progress,
    storedImageArtifactPaths: input.storedImageArtifactPaths,
    validation: evaluateLiveImageQueueEvidence(input.result),
  };
}

function evidenceJob(job: ProviderJob): LiveImageQueueEvidenceJob {
  return {
    id: job.id,
    providerId: job.providerId,
    capability: job.capability,
    description: job.description,
    status: job.status,
    createdAt: job.createdAt,
    ...(job.startedAt === undefined ? {} : { startedAt: job.startedAt }),
    ...(job.finishedAt === undefined ? {} : { finishedAt: job.finishedAt }),
    attempt: job.attempt,
    ...(job.progress === undefined ? {} : { progress: job.progress }),
    cancelRequested: job.cancelRequested,
    ...(job.usageSummary === undefined ? {} : { usageSummary: job.usageSummary }),
    ...(job.errorMessage === undefined ? {} : { errorMessage: job.errorMessage }),
  };
}

function liveImageQueueEvidencePath(projectId: string, jobId: string): string {
  return `projects/${safeSegment(projectId, "project id")}/live-evidence/df233-image-queue-${safeSegment(
    jobId,
    "job id",
  )}.json`;
}

function safeSegment(value: string, label: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
  throw new ImageArtifactStoreError(`Live image queue evidence ${label} must be safe.`);
}
