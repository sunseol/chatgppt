import type {
  LiveImageQueueEvidenceIssue,
  LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

type ReadyQueueResult = Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>;

export function queueProgressIssues(
  result: ReadyQueueResult,
): readonly LiveImageQueueEvidenceIssue[] {
  return [...progressCountIssues(result), ...statusCountIssues(result)];
}

function progressCountIssues(result: ReadyQueueResult): readonly LiveImageQueueEvidenceIssue[] {
  const expectedPercent = completionPercent(
    result.progress.completed,
    result.progress.failed,
    result.progress.total,
  );
  return result.progress.completed === result.slides.length &&
    result.progress.failed === result.failures.length &&
    result.progress.total === result.context.slideCount &&
    result.progress.percent === expectedPercent
    ? []
    : [
        {
          code: "queue_progress_count_mismatch" satisfies LiveImageQueueEvidenceIssueCode,
          message:
            "Live image queue progress must match recorded slides, failures, and slide count.",
        },
      ];
}

function statusCountIssues(result: ReadyQueueResult): readonly LiveImageQueueEvidenceIssue[] {
  const terminalCount = result.slides.length + result.failures.length;
  const expectedStatus = queueStatus(result.slides.length, result.failures.length);
  return terminalCount === result.context.slideCount && result.status === expectedStatus
    ? []
    : [
        {
          code: "queue_status_count_mismatch" satisfies LiveImageQueueEvidenceIssueCode,
          message:
            "Live image queue status must match the final recorded slide and failure counts.",
        },
      ];
}

function completionPercent(completed: number, failed: number, total: number): number {
  return total === 0 ? 100 : Math.round(((completed + failed) / total) * 100);
}

function queueStatus(completedCount: number, failureCount: number): ReadyQueueResult["status"] {
  if (failureCount === 0) return "succeeded";
  return completedCount === 0 ? "failed" : "partial_failure";
}
