import { describe, expect, test } from "bun:test";
import {
  evaluateLiveImageQueueEvidence,
  type LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import { createPromptUsageRecord } from "./prompt-assets";
import type { GeneratedSlide } from "./deck-types";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

describe("live image queue progress evidence", () => {
  test("blocks queue evidence whose progress counts do not match recorded slides and failures", () => {
    // Given
    const result = readyQueueResult({
      slides: [slide(1), slide(2), slide(3), slide(4), slide(5)],
      failures: [],
      progress: { completed: 4, failed: 0, total: 5, percent: 80 },
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["queue_progress_count_mismatch"]);
  });

  test("blocks queue evidence whose status contradicts slide and failure counts", () => {
    // Given
    const result = readyQueueResult({
      status: "succeeded",
      failures: [
        {
          jobId: "job_failed",
          bundleId: "bundle_failed",
          slideNumber: 1,
          retryable: true,
          attempts: 1,
          failureKind: "server",
          retryDelaysMs: [],
          errorMessage: "upstream 503",
          userMessage: "Slide 1 failed.",
        },
      ],
      jobs: [
        {
          id: "job_failed",
          providerId: "openaiImage",
          capability: "imageGeneration",
          description: "Generate slide 1",
          status: "failed",
          createdAt: 1_789_900_000,
          attempt: 1,
          cancelRequested: false,
        },
      ],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_failed",
          jobId: "job_failed",
          recordedAt: 1_789_900_000,
        }),
      ],
      progress: { completed: 0, failed: 1, total: 5, percent: 20 },
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["queue_status_count_mismatch"]);
  });
});

function issueCodes(
  validation: ReturnType<typeof evaluateLiveImageQueueEvidence>,
): readonly LiveImageQueueEvidenceIssueCode[] {
  return validation.kind === "blocked" ? validation.issues.map((issue) => issue.code) : [];
}

function slide(number: number): GeneratedSlide {
  return {
    number,
    version: 1,
    status: "ready",
    imageDescriptor: `Slide ${number}`,
  };
}

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
    progress: { completed: 0, failed: 0, total: 5, percent: 0 },
    ...overrides,
  };
}
