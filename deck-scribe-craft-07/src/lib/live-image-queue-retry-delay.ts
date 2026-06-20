import type {
  LiveImageQueueEvidenceIssue,
  LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

type ReadyQueueResult = Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>;

export function retryDelayIssues(
  failures: ReadyQueueResult["failures"],
  retryProvenance: ReadyQueueResult["retryProvenance"],
): readonly LiveImageQueueEvidenceIssue[] {
  return failures.flatMap((failure): readonly LiveImageQueueEvidenceIssue[] => {
    const retryEvents = retryProvenance.filter((event) => event.jobId === failure.jobId);
    if (retryEvents.length === 0 && failure.retryDelaysMs.length === 0) return [];
    return sameDelayHistory(
      retryEvents.map((event) => event.delayMs),
      failure.retryDelaysMs,
    )
      ? []
      : [
          {
            code: "retry_delay_history_mismatch" satisfies LiveImageQueueEvidenceIssueCode,
            jobId: failure.jobId,
            slideNumber: failure.slideNumber,
            message: "Retry provenance delay history must match the failed slide evidence.",
          },
        ];
  });
}

function sameDelayHistory(
  provenanceDelaysMs: readonly number[],
  failureDelaysMs: readonly number[],
): boolean {
  return (
    provenanceDelaysMs.length === failureDelaysMs.length &&
    provenanceDelaysMs.every((delayMs, index) => delayMs === failureDelaysMs[index])
  );
}
