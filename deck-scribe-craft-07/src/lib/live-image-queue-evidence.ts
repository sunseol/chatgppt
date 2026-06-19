import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";
import type { ImageProviderFailureKind } from "./image-provider-errors";
import type { PromptUsageRecord } from "./prompt-assets";
import type { ProviderJob } from "./provider-job-manager";

export type LiveImageQueueEvidenceIssueCode =
  | "queue_result_blocked"
  | "retry_job_not_found"
  | "retry_attempt_count_mismatch"
  | "retry_attempt_sequence_mismatch"
  | "retry_prompt_usage_missing"
  | "retry_bundle_mismatch"
  | "retry_non_transient_failure"
  | "cancel_failure_without_cancelled_job"
  | "cancel_prompt_usage_missing"
  | "cancel_bundle_mismatch"
  | "cancel_failure_without_cancel_signal";

export type LiveImageQueueEvidenceIssue = {
  readonly code: LiveImageQueueEvidenceIssueCode;
  readonly jobId?: string;
  readonly slideNumber?: number;
  readonly message: string;
};

export type LiveImageQueueEvidenceValidation =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly LiveImageQueueEvidenceIssue[] };

export function evaluateLiveImageQueueEvidence(
  result: SlideGenerationQueueResult,
): LiveImageQueueEvidenceValidation {
  if (result.kind === "blocked") {
    return {
      kind: "blocked",
      issues: [
        {
          code: "queue_result_blocked",
          message: result.issues.join(" "),
        },
      ],
    };
  }
  const issues = [
    ...retryJobIssues(result.jobs, result.retryProvenance),
    ...retryAttemptIssues(result.jobs, result.retryProvenance),
    ...retryBundleIssues(result.promptUsages, result.retryProvenance),
    ...retryFailureKindIssues(result.retryProvenance),
    ...cancellationIssues(result.jobs, result.failures, result.promptUsages),
  ];
  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

type ReadyQueueResult = Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>;

function retryJobIssues(
  jobs: ReadyQueueResult["jobs"],
  retryProvenance: ReadyQueueResult["retryProvenance"],
): readonly LiveImageQueueEvidenceIssue[] {
  const jobIds = new Set(jobs.map((job) => job.id));
  return retryProvenance.flatMap((event) =>
    jobIds.has(event.jobId)
      ? []
      : [
          {
            code: "retry_job_not_found" as const,
            jobId: event.jobId,
            slideNumber: event.slideNumber,
            message: "Retry provenance must reference a recorded provider job.",
          },
        ],
  );
}

function retryAttemptIssues(
  jobs: ReadyQueueResult["jobs"],
  retryProvenance: ReadyQueueResult["retryProvenance"],
): readonly LiveImageQueueEvidenceIssue[] {
  return jobs.flatMap((job): readonly LiveImageQueueEvidenceIssue[] => {
    const retryEvents = retryProvenance.filter((event) => event.jobId === job.id);
    const retryCount = retryEvents.length;
    const expectedRetryCount = Math.max(0, job.attempt - 1);
    if (retryCount !== expectedRetryCount) {
      return [
        {
          code: "retry_attempt_count_mismatch" as const,
          jobId: job.id,
          message: `Retry evidence for ${job.id} does not match final attempt ${job.attempt}.`,
        },
      ];
    }
    return retryEvents.every((event, index) => event.attempt === index + 1)
      ? []
      : [
          {
            code: "retry_attempt_sequence_mismatch" as const,
            jobId: job.id,
            message: `Retry evidence for ${job.id} must preserve attempts 1 through ${expectedRetryCount}.`,
          },
        ];
  });
}

function retryBundleIssues(
  promptUsages: readonly PromptUsageRecord[],
  retryProvenance: ReadyQueueResult["retryProvenance"],
): readonly LiveImageQueueEvidenceIssue[] {
  return retryProvenance.flatMap((event): readonly LiveImageQueueEvidenceIssue[] => {
    const bundleId = promptUsages.find((usage) => usage.jobId === event.jobId)?.artifactId;
    if (bundleId === undefined) {
      return [
        {
          code: "retry_prompt_usage_missing" as const,
          jobId: event.jobId,
          slideNumber: event.slideNumber,
          message: "Retry provenance must be tied to recorded slide-generation prompt usage.",
        },
      ];
    }
    return bundleId === event.bundleId
      ? []
      : [
          {
            code: "retry_bundle_mismatch" as const,
            jobId: event.jobId,
            slideNumber: event.slideNumber,
            message: "Retry provenance must reference the same bundle as the slide prompt usage.",
          },
        ];
  });
}

function retryFailureKindIssues(
  retryProvenance: ReadyQueueResult["retryProvenance"],
): readonly LiveImageQueueEvidenceIssue[] {
  return retryProvenance.flatMap((event) =>
    isTransientFailure(event.failureKind)
      ? []
      : [
          {
            code: "retry_non_transient_failure" as const,
            jobId: event.jobId,
            slideNumber: event.slideNumber,
            message: "Retry provenance may only count transient image provider failures.",
          },
        ],
  );
}

function cancellationIssues(
  jobs: readonly ProviderJob[],
  failures: ReadyQueueResult["failures"],
  promptUsages: readonly PromptUsageRecord[],
): readonly LiveImageQueueEvidenceIssue[] {
  return failures
    .filter((failure) => failure.failureKind === "cancelled")
    .flatMap((failure): readonly LiveImageQueueEvidenceIssue[] => {
      const job = jobs.find((candidate) => candidate.id === failure.jobId);
      if (job?.status !== "cancelled") {
        return [
          {
            code: "cancel_failure_without_cancelled_job" as const,
            jobId: failure.jobId,
            slideNumber: failure.slideNumber,
            message: "Cancellation failure evidence must have a cancelled provider job.",
          },
        ];
      }
      const promptUsage = promptUsages.find((usage) => usage.jobId === failure.jobId);
      const promptIssue = cancelPromptIssue(failure, promptUsage);
      const signalIssue = job.cancelRequested
        ? []
        : [
            {
              code: "cancel_failure_without_cancel_signal" as const,
              jobId: failure.jobId,
              slideNumber: failure.slideNumber,
              message: "Cancelled provider jobs must preserve the user cancel signal.",
            },
          ];
      return [...promptIssue, ...signalIssue];
    });
}

function cancelPromptIssue(
  failure: ReadyQueueResult["failures"][number],
  promptUsage: PromptUsageRecord | undefined,
): readonly LiveImageQueueEvidenceIssue[] {
  if (!promptUsage) {
    return [
      {
        code: "cancel_prompt_usage_missing" as const,
        jobId: failure.jobId,
        slideNumber: failure.slideNumber,
        message: "Cancellation evidence must be tied to recorded slide-generation prompt usage.",
      },
    ];
  }
  return promptUsage.artifactId === failure.bundleId
    ? []
    : [
        {
          code: "cancel_bundle_mismatch" as const,
          jobId: failure.jobId,
          slideNumber: failure.slideNumber,
          message:
            "Cancellation evidence must reference the same bundle as the slide prompt usage.",
        },
      ];
}

function isTransientFailure(kind: ImageProviderFailureKind): boolean {
  return kind === "rate_limit" || kind === "server" || kind === "unknown";
}
