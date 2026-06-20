import type { GeneratedSlide } from "./deck-types";
import type { LiveImageQueueEvidenceIssue } from "./live-image-queue-evidence";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

type ReadyQueueResult = Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>;

export function retrySlideIssues(
  jobs: ReadyQueueResult["jobs"],
  failures: ReadyQueueResult["failures"],
  retryProvenance: ReadyQueueResult["retryProvenance"],
): readonly LiveImageQueueEvidenceIssue[] {
  return retryProvenance.flatMap((event): readonly LiveImageQueueEvidenceIssue[] => {
    const expectedSlideNumber = retrySlideNumberForJob(event.jobId, jobs, failures);
    return expectedSlideNumber === undefined || expectedSlideNumber === event.slideNumber
      ? []
      : [
          {
            code: "retry_slide_mismatch" as const,
            jobId: event.jobId,
            slideNumber: event.slideNumber,
            message: "Retry provenance must reference the same slide as the retried job.",
          },
        ];
  });
}

function retrySlideNumberForJob(
  jobId: string,
  jobs: ReadyQueueResult["jobs"],
  failures: ReadyQueueResult["failures"],
): number | undefined {
  const failure = failures.find((candidate) => candidate.jobId === jobId);
  if (failure) return failure.slideNumber;
  return slideNumberFromOutput(jobs.find((candidate) => candidate.id === jobId)?.output);
}

function slideNumberFromOutput(output: unknown): GeneratedSlide["number"] | undefined {
  if (typeof output !== "object" || output === null || !("number" in output)) return undefined;
  return typeof output.number === "number" ? output.number : undefined;
}
