import { describe, expect, test } from "bun:test";
import { createPromptUsageRecord } from "./prompt-assets";
import { evaluateLiveImageQueueEvidence } from "./live-image-queue-evidence";
import {
  providerJobFixture as job,
  readyQueueResultFixture as readyQueueResult,
} from "./live-image-queue-test-fixtures";

describe("live image queue evidence identity", () => {
  test("blocks queue evidence identities that only match after preserving boundary whitespace", () => {
    const paddedJobId = " job_retry ";
    const paddedBundleId = " bundle_retry ";
    const result = readyQueueResult({
      jobs: [job({ id: paddedJobId, attempt: 2 })],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: paddedBundleId,
          jobId: paddedJobId,
          recordedAt: 1_789_500_000,
        }),
      ],
      retryProvenance: [
        {
          jobId: paddedJobId,
          bundleId: paddedBundleId,
          slideNumber: 1,
          attempt: 1,
          delayMs: 500,
          failureKind: "rate_limit",
          message: "rate limited",
        },
      ],
    });

    const validation = evaluateLiveImageQueueEvidence(result);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "noncanonical_queue_evidence_identity",
    ]);
  });
});
