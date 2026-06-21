import { describe, expect, test } from "bun:test";
import {
  evaluateLiveImageQueueEvidence,
  type LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import { readyQueueResultFixture as readyQueueResult } from "./live-image-queue-test-fixtures";
import { createPromptUsageRecord } from "./prompt-assets";
import type { ProviderJob } from "./provider-job-manager";

describe("live image queue cancellation attempt evidence", () => {
  test("blocks cancellation failures whose attempt count differs from the cancelled job", () => {
    // Given
    const result = readyQueueResult({
      failures: [
        {
          jobId: "job_cancel",
          bundleId: "bundle_cancel",
          slideNumber: 2,
          retryable: true,
          attempts: 1,
          failureKind: "cancelled",
          retryDelaysMs: [500],
          errorMessage: "cancelled",
          userMessage: "Slide 2 was cancelled.",
        },
      ],
      jobs: [job({ id: "job_cancel", status: "cancelled", attempt: 2, cancelRequested: true })],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_cancel",
          jobId: "job_cancel",
          recordedAt: 1_789_600_000,
        }),
      ],
      retryProvenance: [
        {
          jobId: "job_cancel",
          bundleId: "bundle_cancel",
          slideNumber: 2,
          attempt: 1,
          delayMs: 500,
          failureKind: "rate_limit",
          message: "rate limited",
        },
      ],
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["cancel_attempt_count_mismatch"]);
  });
});

function issueCodes(
  validation: ReturnType<typeof evaluateLiveImageQueueEvidence>,
): readonly LiveImageQueueEvidenceIssueCode[] {
  return validation.kind === "blocked" ? validation.issues.map((issue) => issue.code) : [];
}

function job(input: {
  readonly id: string;
  readonly status: ProviderJob["status"];
  readonly attempt: number;
  readonly cancelRequested: boolean;
}): ProviderJob {
  return {
    id: input.id,
    providerId: "openaiImage",
    capability: "imageGeneration",
    description: "Generate slide 2",
    status: input.status,
    createdAt: 1_789_600_000,
    attempt: input.attempt,
    cancelRequested: input.cancelRequested,
  };
}
