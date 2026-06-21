import { describe, expect, test } from "bun:test";
import { createPromptUsageRecord } from "./prompt-assets";
import { evaluateLiveImageQueueEvidence } from "./live-image-queue-evidence";
import {
  providerJobFixture as job,
  readyQueueResultFixture as readyQueueResult,
} from "./live-image-queue-test-fixtures";

describe("live image queue retry delay validity", () => {
  test("blocks retry provenance with negative delay evidence", () => {
    // Given
    const result = readyQueueResult({
      jobs: [job({ id: "job_retry", attempt: 2 })],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_retry",
          jobId: "job_retry",
          recordedAt: 1_789_500_000,
        }),
      ],
      retryProvenance: [
        {
          jobId: "job_retry",
          bundleId: "bundle_retry",
          slideNumber: 1,
          attempt: 1,
          delayMs: -1,
          failureKind: "rate_limit",
          message: "rate limited",
        },
      ],
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["retry_delay_invalid"]);
  });
});
