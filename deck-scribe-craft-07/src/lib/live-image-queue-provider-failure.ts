import type {
  LiveImageQueueEvidenceIssue,
  LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import type { PromptUsageRecord } from "./prompt-assets";
import type { ProviderJob } from "./provider-job-manager";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

type ReadyQueueResult = Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>;

export function providerFailureIssues(
  jobs: readonly ProviderJob[],
  failures: ReadyQueueResult["failures"],
  promptUsages: readonly PromptUsageRecord[],
): readonly LiveImageQueueEvidenceIssue[] {
  return failures
    .filter((failure) => failure.failureKind !== "cancelled")
    .flatMap((failure): readonly LiveImageQueueEvidenceIssue[] => {
      const job = jobs.find((candidate) => candidate.id === failure.jobId);
      const promptUsage = promptUsages.find((usage) => usage.jobId === failure.jobId);
      return [...failureJobIssues(failure, job), ...failurePromptIssues(failure, promptUsage)];
    });
}

function failureJobIssues(
  failure: ReadyQueueResult["failures"][number],
  job: ProviderJob | undefined,
): readonly LiveImageQueueEvidenceIssue[] {
  if (!job) {
    return [
      {
        code: "failure_job_not_found" satisfies LiveImageQueueEvidenceIssueCode,
        jobId: failure.jobId,
        slideNumber: failure.slideNumber,
        message: "Provider failure evidence must reference a recorded provider job.",
      },
    ];
  }
  const statusIssues: readonly LiveImageQueueEvidenceIssue[] =
    job.status === "failed"
      ? []
      : [
          {
            code: "failure_without_failed_job" satisfies LiveImageQueueEvidenceIssueCode,
            jobId: failure.jobId,
            slideNumber: failure.slideNumber,
            message: "Provider failure evidence must have a failed provider job.",
          },
        ];
  const attemptIssues: readonly LiveImageQueueEvidenceIssue[] =
    failure.attempts === job.attempt
      ? []
      : [
          {
            code: "failure_attempt_count_mismatch" satisfies LiveImageQueueEvidenceIssueCode,
            jobId: failure.jobId,
            slideNumber: failure.slideNumber,
            message: "Provider failure attempts must match the failed provider job attempt.",
          },
        ];
  return [...statusIssues, ...attemptIssues];
}

function failurePromptIssues(
  failure: ReadyQueueResult["failures"][number],
  promptUsage: PromptUsageRecord | undefined,
): readonly LiveImageQueueEvidenceIssue[] {
  if (!promptUsage) {
    return [
      {
        code: "failure_prompt_usage_missing" satisfies LiveImageQueueEvidenceIssueCode,
        jobId: failure.jobId,
        slideNumber: failure.slideNumber,
        message:
          "Provider failure evidence must be tied to recorded slide-generation prompt usage.",
      },
    ];
  }
  return promptUsage.artifactId === failure.bundleId
    ? []
    : [
        {
          code: "failure_bundle_mismatch" satisfies LiveImageQueueEvidenceIssueCode,
          jobId: failure.jobId,
          slideNumber: failure.slideNumber,
          message:
            "Provider failure evidence must reference the same bundle as the slide prompt usage.",
        },
      ];
}
