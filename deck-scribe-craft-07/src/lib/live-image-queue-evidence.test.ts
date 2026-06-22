import { describe, expect, test } from "bun:test";
import { createPromptUsageRecord } from "./prompt-assets";
import {
  evaluateLiveImageQueueEvidence,
  type LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import {
  providerJobFixture as job,
  readyQueueResultFixture as readyQueueResult,
} from "./live-image-queue-test-fixtures";

describe("live image queue evidence", () => {
  test("accepts retry and cancellation evidence when provenance matches recorded jobs", () => {
    // Given
    const result = readyQueueResult({
      jobs: [
        job({ id: "job_retry", attempt: 2 }),
        job({ id: "job_cancel", status: "cancelled", cancelRequested: true }),
      ],
      failures: [
        {
          jobId: "job_cancel",
          bundleId: "bundle_cancel",
          slideNumber: 2,
          retryable: true,
          attempts: 1,
          failureKind: "cancelled",
          retryDelaysMs: [],
          errorMessage: "cancelled",
          userMessage: "Slide 2 was cancelled.",
        },
      ],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_retry",
          jobId: "job_retry",
          recordedAt: 1_789_500_000,
        }),
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_cancel",
          jobId: "job_cancel",
          recordedAt: 1_789_500_001,
        }),
      ],
      retryProvenance: [
        {
          jobId: "job_retry",
          bundleId: "bundle_retry",
          slideNumber: 1,
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
    expect(validation).toEqual({ kind: "ready" });
  });

  test("blocks retry evidence that does not match the final job attempt and bundle", () => {
    // Given
    const result = readyQueueResult({
      jobs: [job({ id: "job_retry", attempt: 3 })],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_live_001",
          jobId: "job_retry",
          recordedAt: 1_789_500_000,
        }),
      ],
      retryProvenance: [
        {
          jobId: "job_retry",
          bundleId: "bundle_other",
          slideNumber: 1,
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
    expect(issueCodes(validation)).toEqual([
      "retry_attempt_count_mismatch",
      "retry_bundle_mismatch",
    ]);
  });

  test("blocks retry evidence that repeats an attempt instead of preserving sequence", () => {
    // Given
    const result = readyQueueResult({
      jobs: [job({ id: "job_retry", attempt: 3 })],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_live_001",
          jobId: "job_retry",
          recordedAt: 1_789_500_000,
        }),
      ],
      retryProvenance: [
        {
          jobId: "job_retry",
          bundleId: "bundle_live_001",
          slideNumber: 1,
          attempt: 1,
          delayMs: 500,
          failureKind: "rate_limit",
          message: "rate limited",
        },
        {
          jobId: "job_retry",
          bundleId: "bundle_live_001",
          slideNumber: 1,
          attempt: 1,
          delayMs: 1_000,
          failureKind: "server",
          message: "server error",
        },
      ],
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["retry_attempt_sequence_mismatch"]);
  });

  test("blocks cancellation failures without a cancelled provider job", () => {
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
          retryDelaysMs: [],
          errorMessage: "cancelled",
          userMessage: "Slide 2 was cancelled.",
        },
      ],
      jobs: [job({ id: "job_cancel", status: "failed", cancelRequested: true })],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_cancel",
          jobId: "job_cancel",
          recordedAt: 1_789_500_000,
        }),
      ],
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["cancel_failure_without_cancelled_job"]);
  });

  test("blocks cancellation failures tied to a different prompt bundle", () => {
    // Given
    const result = readyQueueResult({
      failures: [
        {
          jobId: "job_cancel",
          bundleId: "bundle_other",
          slideNumber: 2,
          retryable: true,
          attempts: 1,
          failureKind: "cancelled",
          retryDelaysMs: [],
          errorMessage: "cancelled",
          userMessage: "Slide 2 was cancelled.",
        },
      ],
      jobs: [job({ id: "job_cancel", status: "cancelled", cancelRequested: true })],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_cancel",
          jobId: "job_cancel",
          recordedAt: 1_789_500_000,
        }),
      ],
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["cancel_bundle_mismatch"]);
  });

  test("blocks retry provenance that is not tied to recorded job prompt usage", () => {
    // Given
    const result = readyQueueResult({
      retryProvenance: [
        {
          jobId: "job_orphan_retry",
          bundleId: "bundle_orphan",
          slideNumber: 3,
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
    expect(issueCodes(validation)).toEqual(["retry_job_not_found", "retry_prompt_usage_missing"]);
  });

  test("blocks provider failure evidence that is not tied to recorded job prompt usage", () => {
    // Given
    const result = readyQueueResult({
      failures: [
        {
          jobId: "job_failed",
          bundleId: "bundle_failed",
          slideNumber: 3,
          retryable: false,
          attempts: 1,
          failureKind: "server",
          retryDelaysMs: [],
          errorMessage: "upstream 503",
          userMessage: "Slide 3 failed after retry.",
        },
      ],
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual([
      "failure_job_not_found",
      "failure_prompt_usage_missing",
    ]);
  });
});

function issueCodes(
  validation: ReturnType<typeof evaluateLiveImageQueueEvidence>,
): readonly LiveImageQueueEvidenceIssueCode[] {
  return validation.kind === "blocked" ? validation.issues.map((issue) => issue.code) : [];
}
