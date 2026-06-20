import { describe, expect, test } from "bun:test";
import { createPromptUsageRecord } from "./prompt-assets";
import type { ProviderJob } from "./provider-job-manager";
import { evaluateLiveImageQueueEvidence } from "./live-image-queue-evidence";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

describe("live image queue cancelled job evidence", () => {
  test("blocks cancelled provider jobs that are missing slide failure evidence", () => {
    // Given
    const result = readyQueueResult({
      status: "succeeded",
      jobs: [job({ id: "job_cancel", status: "cancelled", cancelRequested: true })],
      failures: [],
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
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["cancelled_job_missing_failure"]);
  });
});

function readyQueueResult(
  overrides: Partial<Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>>,
): SlideGenerationQueueResult {
  return {
    kind: "ready",
    status: "succeeded",
    context: {
      deckContextId: "deck_context_live",
      deckContextHash: "sha256:context",
      designSystemId: "design_live",
      designTokenHash: "sha256:design",
      layoutPrototypeId: "layout_live",
      slideCount: 5,
    },
    slides: [],
    failures: [],
    jobs: [],
    promptUsages: [],
    retryProvenance: [],
    concurrency: { requestedMaxParallel: 3, effectiveMaxParallel: 3, observedMaxRunning: 0 },
    progress: { completed: 5, failed: 0, total: 5, percent: 100 },
    ...overrides,
  };
}

function job(overrides: Partial<ProviderJob>): ProviderJob {
  return {
    id: "job_live",
    providerId: "openaiImage",
    capability: "imageGeneration",
    description: "Generate slide",
    status: "succeeded",
    createdAt: 1_789_500_000,
    attempt: 1,
    cancelRequested: false,
    ...overrides,
  };
}
