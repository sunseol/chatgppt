import type { LiveImageQueueEvidenceIssue } from "./live-image-queue-evidence";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

type ReadyQueueResult = Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>;

export function concurrencyIssues(
  concurrency: ReadyQueueResult["concurrency"],
): readonly LiveImageQueueEvidenceIssue[] {
  if (concurrency === undefined) {
    return [
      {
        code: "missing_concurrency_evidence" as const,
        message: "Live image queue evidence must include observed concurrency proof.",
      },
    ];
  }
  if (
    !isPositiveCount(concurrency.requestedMaxParallel) ||
    !isPositiveCount(concurrency.effectiveMaxParallel) ||
    !isNonNegativeCount(concurrency.observedMaxRunning)
  ) {
    return [
      {
        code: "invalid_concurrency_evidence" as const,
        message: "Live image queue requested and effective concurrency must be positive integers.",
      },
    ];
  }
  if (
    concurrency.effectiveMaxParallel > concurrency.requestedMaxParallel ||
    concurrency.observedMaxRunning > concurrency.effectiveMaxParallel
  ) {
    return [
      {
        code: "concurrency_limit_exceeded" as const,
        message: "Live image queue observed concurrency must not exceed the configured limit.",
      },
    ];
  }
  return [];
}

function isPositiveCount(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
