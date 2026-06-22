import { ImageArtifactStoreError, type ImageArtifactStore } from "./image-artifact-store";
import type { LiveInterruptionScenarioEvidence } from "./live-interruption-matrix";
import type { PromptUsageRecord } from "./prompt-assets";
import type { ProviderJob } from "./provider-job-manager";
import type {
  SlideGenerationFailure,
  SlideGenerationQueueResult,
} from "./slide-generation-queue-types";

type ReadySlideGenerationQueueResult = Extract<
  SlideGenerationQueueResult,
  { readonly kind: "ready" }
>;

export type LiveInterruptionCancelEvidenceExportIssue =
  | "cancel_failure_missing"
  | "cancel_job_missing"
  | "cancel_job_not_cancelled"
  | "cancel_signal_missing"
  | "cancel_prompt_usage_missing"
  | "cancel_bundle_mismatch"
  | "cancel_attempt_mismatch";

export type LiveInterruptionCancelJobEvidence = {
  readonly id: string;
  readonly providerId: string;
  readonly capability: ProviderJob["capability"];
  readonly description: string;
  readonly status: ProviderJob["status"];
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly finishedAt?: number;
  readonly attempt: number;
  readonly cancelRequested: boolean;
  readonly errorMessage?: string;
};

export type LiveInterruptionCancelRecoverySnapshot = {
  readonly schemaVersion: 1;
  readonly issue: "DF-243";
  readonly scenarioId: "cancel_job";
  readonly projectId: string;
  readonly jobId: string;
  readonly exportedAt: number;
  readonly recoverySnapshotScope: "app_storage";
  readonly jobStatusAfterRestart: "cancelled";
  readonly completedArtifactIdsBefore: readonly string[];
  readonly completedArtifactIdsAfter: readonly string[];
  readonly failure: SlideGenerationFailure;
  readonly job: LiveInterruptionCancelJobEvidence;
  readonly promptUsage: PromptUsageRecord;
  readonly cancelSignalEvidencePath: string;
};

export type LiveInterruptionCancelSignalEvidence = {
  readonly schemaVersion: 1;
  readonly issue: "DF-243";
  readonly scenarioId: "cancel_job";
  readonly projectId: string;
  readonly jobId: string;
  readonly exportedAt: number;
  readonly liveJobId: string;
  readonly cancelSignalJobId: string;
  readonly providerId: string;
  readonly capability: ProviderJob["capability"];
  readonly promptBundleId: string;
  readonly slideNumber: number;
  readonly attempt: number;
  readonly cancelledAt?: number;
};

export type LiveInterruptionCancelEvidenceExportResult =
  | {
      readonly kind: "written";
      readonly recoverySnapshotPath: string;
      readonly cancelSignalEvidencePath: string;
      readonly scenario: LiveInterruptionScenarioEvidence;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveInterruptionCancelEvidenceExportIssue[];
    };

type ResolvedCancelEvidence = {
  readonly kind: "resolved";
  readonly failure: SlideGenerationFailure;
  readonly job: ProviderJob;
  readonly promptUsage: PromptUsageRecord;
};

type ResolveCancelEvidenceResult =
  | ResolvedCancelEvidence
  | {
      readonly kind: "blocked";
      readonly issues: readonly LiveInterruptionCancelEvidenceExportIssue[];
    };

export async function writeLiveInterruptionCancelEvidenceExport(input: {
  readonly store: ImageArtifactStore;
  readonly projectId: string;
  readonly jobId: string;
  readonly exportedAt: number;
  readonly result: ReadySlideGenerationQueueResult;
  readonly completedArtifactIdsBefore?: readonly string[];
  readonly completedArtifactIdsAfter?: readonly string[];
}): Promise<LiveInterruptionCancelEvidenceExportResult> {
  const resolved = resolveCancelEvidence(input.result);
  if (resolved.kind === "blocked") return resolved;

  const recoverySnapshotPath = cancelRecoverySnapshotPath(input.projectId, input.jobId);
  const cancelSignalEvidencePath = cancelSignalPath(input.projectId, input.jobId);
  const completedArtifactIdsBefore = input.completedArtifactIdsBefore ?? [];
  const completedArtifactIdsAfter = input.completedArtifactIdsAfter ?? [];
  const recoverySnapshot: LiveInterruptionCancelRecoverySnapshot = {
    schemaVersion: 1,
    issue: "DF-243",
    scenarioId: "cancel_job",
    projectId: input.projectId,
    jobId: input.jobId,
    exportedAt: input.exportedAt,
    recoverySnapshotScope: "app_storage",
    jobStatusAfterRestart: "cancelled",
    completedArtifactIdsBefore,
    completedArtifactIdsAfter,
    failure: resolved.failure,
    job: cancelJobEvidence(resolved.job),
    promptUsage: resolved.promptUsage,
    cancelSignalEvidencePath,
  };
  const cancelSignal: LiveInterruptionCancelSignalEvidence = {
    schemaVersion: 1,
    issue: "DF-243",
    scenarioId: "cancel_job",
    projectId: input.projectId,
    jobId: input.jobId,
    exportedAt: input.exportedAt,
    liveJobId: resolved.job.id,
    cancelSignalJobId: resolved.job.id,
    providerId: resolved.job.providerId,
    capability: resolved.job.capability,
    promptBundleId: resolved.failure.bundleId,
    slideNumber: resolved.failure.slideNumber,
    attempt: resolved.job.attempt,
    ...(resolved.job.finishedAt === undefined ? {} : { cancelledAt: resolved.job.finishedAt }),
  };

  await input.store.write({
    path: recoverySnapshotPath,
    content: JSON.stringify(recoverySnapshot, null, 2),
  });
  await input.store.write({
    path: cancelSignalEvidencePath,
    content: JSON.stringify(cancelSignal, null, 2),
  });

  return {
    kind: "written",
    recoverySnapshotPath,
    cancelSignalEvidencePath,
    scenario: {
      id: "cancel_job",
      jobStatusAfterRestart: "cancelled",
      completedArtifactIdsBefore,
      completedArtifactIdsAfter,
      liveJobId: resolved.job.id,
      recoverySnapshotPath,
      recoverySnapshotScope: "app_storage",
      cancellationRecorded: true,
      cancelSignalEvidencePath,
      cancelSignalJobId: resolved.job.id,
      pendingImageArtifactIds: [],
      resumedArtifactIds: [],
      cancelledJobStillRunning: false,
      interruptedArtifactIds: [],
      approvableArtifactIds: [],
      exportableArtifactIds: [],
      approvalGateChecked: false,
      exportGateChecked: false,
    },
  };
}

function resolveCancelEvidence(
  result: ReadySlideGenerationQueueResult,
): ResolveCancelEvidenceResult {
  const failure = result.failures.find((candidate) => candidate.failureKind === "cancelled");
  if (failure === undefined) return blocked("cancel_failure_missing");

  const job = result.jobs.find((candidate) => candidate.id === failure.jobId);
  if (job === undefined) return blocked("cancel_job_missing");
  if (job.status !== "cancelled") return blocked("cancel_job_not_cancelled");
  if (!job.cancelRequested) return blocked("cancel_signal_missing");
  if (job.attempt !== failure.attempts) return blocked("cancel_attempt_mismatch");

  const promptUsage = result.promptUsages.find((candidate) => candidate.jobId === failure.jobId);
  if (promptUsage === undefined) return blocked("cancel_prompt_usage_missing");
  if (promptUsage.artifactId !== failure.bundleId) return blocked("cancel_bundle_mismatch");

  return { kind: "resolved", failure, job, promptUsage };
}

function cancelJobEvidence(job: ProviderJob): LiveInterruptionCancelJobEvidence {
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
    cancelRequested: job.cancelRequested,
    ...(job.errorMessage === undefined ? {} : { errorMessage: job.errorMessage }),
  };
}

function cancelRecoverySnapshotPath(projectId: string, jobId: string): string {
  return `projects/${safeSegment(projectId, "project id")}/live-evidence/df243-cancel-job-recovery-snapshot-${safeSegment(
    jobId,
    "job id",
  )}.json`;
}

function cancelSignalPath(projectId: string, jobId: string): string {
  return `projects/${safeSegment(projectId, "project id")}/live-evidence/df243-cancel-job-cancel-signal-${safeSegment(
    jobId,
    "job id",
  )}.json`;
}

function blocked(issue: LiveInterruptionCancelEvidenceExportIssue): {
  readonly kind: "blocked";
  readonly issues: readonly LiveInterruptionCancelEvidenceExportIssue[];
} {
  return { kind: "blocked", issues: [issue] };
}

function safeSegment(value: string, label: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
  throw new ImageArtifactStoreError(`Live interruption cancel evidence ${label} must be safe.`);
}
