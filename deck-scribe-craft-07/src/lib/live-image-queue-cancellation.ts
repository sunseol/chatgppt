import type {
  LiveImageQueueEvidenceIssue,
  LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import type { PromptUsageRecord } from "./prompt-assets";
import type { ProviderJob } from "./provider-job-manager";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

type ReadyQueueResult = Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>;

export function cancellationIssues(
  jobs: readonly ProviderJob[],
  failures: ReadyQueueResult["failures"],
  promptUsages: readonly PromptUsageRecord[],
): readonly LiveImageQueueEvidenceIssue[] {
  return [
    ...cancelledJobIssues(jobs, failures),
    ...failures
      .filter((failure) => failure.failureKind === "cancelled")
      .flatMap((failure): readonly LiveImageQueueEvidenceIssue[] => {
        const job = jobs.find((candidate) => candidate.id === failure.jobId);
        if (job?.status !== "cancelled") {
          return [
            {
              code: "cancel_failure_without_cancelled_job" satisfies LiveImageQueueEvidenceIssueCode,
              jobId: failure.jobId,
              slideNumber: failure.slideNumber,
              message: "Cancellation failure evidence must have a cancelled provider job.",
            },
          ];
        }
        const promptUsage = promptUsages.find((usage) => usage.jobId === failure.jobId);
        const signalIssues: readonly LiveImageQueueEvidenceIssue[] = job.cancelRequested
          ? []
          : [
              {
                code: "cancel_failure_without_cancel_signal" satisfies LiveImageQueueEvidenceIssueCode,
                jobId: failure.jobId,
                slideNumber: failure.slideNumber,
                message: "Cancelled provider jobs must preserve the user cancel signal.",
              },
            ];
        return [
          ...cancelPromptIssues(failure, promptUsage),
          ...cancelAttemptIssues(failure, job),
          ...signalIssues,
        ];
      }),
  ];
}

function cancelledJobIssues(
  jobs: readonly ProviderJob[],
  failures: ReadyQueueResult["failures"],
): readonly LiveImageQueueEvidenceIssue[] {
  const cancelledFailureJobIds = new Set(
    failures
      .filter((failure) => failure.failureKind === "cancelled")
      .map((failure) => failure.jobId),
  );
  return jobs.flatMap((job): readonly LiveImageQueueEvidenceIssue[] =>
    job.status !== "cancelled" || cancelledFailureJobIds.has(job.id)
      ? []
      : [
          {
            code: "cancelled_job_missing_failure" satisfies LiveImageQueueEvidenceIssueCode,
            jobId: job.id,
            message: "Cancelled provider jobs must have matching slide failure evidence.",
          },
        ],
  );
}

function cancelPromptIssues(
  failure: ReadyQueueResult["failures"][number],
  promptUsage: PromptUsageRecord | undefined,
): readonly LiveImageQueueEvidenceIssue[] {
  if (!promptUsage) {
    return [
      {
        code: "cancel_prompt_usage_missing" satisfies LiveImageQueueEvidenceIssueCode,
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
          code: "cancel_bundle_mismatch" satisfies LiveImageQueueEvidenceIssueCode,
          jobId: failure.jobId,
          slideNumber: failure.slideNumber,
          message:
            "Cancellation evidence must reference the same bundle as the slide prompt usage.",
        },
      ];
}

function cancelAttemptIssues(
  failure: ReadyQueueResult["failures"][number],
  job: ProviderJob,
): readonly LiveImageQueueEvidenceIssue[] {
  return failure.attempts === job.attempt
    ? []
    : [
        {
          code: "cancel_attempt_count_mismatch" satisfies LiveImageQueueEvidenceIssueCode,
          jobId: failure.jobId,
          slideNumber: failure.slideNumber,
          message: "Cancellation failure attempts must match the cancelled provider job attempt.",
        },
      ];
}
