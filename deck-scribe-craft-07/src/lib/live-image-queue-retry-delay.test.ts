import { describe, expect, test } from "bun:test";
import {
  evaluateLiveImageQueueEvidence,
  type LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import { readyQueueResultFixture as readyQueueResult } from "./live-image-queue-test-fixtures";
import { createPromptUsageRecord } from "./prompt-assets";
import type { ProviderJob } from "./provider-job-manager";

describe("live image queue retry delay evidence", () => {
  test("blocks retry provenance whose delay differs from the failed slide delay history", () => {
    // Given
    const result = readyQueueResult({
      jobs: [job({ id: "job_retry", attempt: 2 })],
      failures: [
        {
          jobId: "job_retry",
          bundleId: "bundle_retry",
          slideNumber: 1,
          retryable: true,
          attempts: 2,
          failureKind: "server",
          retryDelaysMs: [1_000],
          errorMessage: "upstream 503",
          userMessage: "Slide 1 failed: upstream 503. Retry is available.",
        },
      ],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_retry",
          jobId: "job_retry",
          recordedAt: 1_789_800_000,
        }),
      ],
      retryProvenance: [
        {
          jobId: "job_retry",
          bundleId: "bundle_retry",
          slideNumber: 1,
          attempt: 1,
          delayMs: 500,
          failureKind: "server",
          message: "upstream 503",
        },
      ],
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["retry_delay_history_mismatch"]);
  });
});

function issueCodes(
  validation: ReturnType<typeof evaluateLiveImageQueueEvidence>,
): readonly LiveImageQueueEvidenceIssueCode[] {
  return validation.kind === "blocked" ? validation.issues.map((issue) => issue.code) : [];
}

function job(overrides: Partial<ProviderJob>): ProviderJob {
  return {
    id: "job_live",
    providerId: "openaiImage",
    capability: "imageGeneration",
    description: "Generate slide",
    status: "failed",
    createdAt: 1_789_800_000,
    attempt: 1,
    cancelRequested: false,
    ...overrides,
  };
}
