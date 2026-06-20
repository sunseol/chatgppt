import { describe, expect, test } from "bun:test";
import type { GeneratedSlide } from "./deck-types";
import {
  evaluateLiveImageQueueEvidence,
  type LiveImageQueueEvidenceIssueCode,
} from "./live-image-queue-evidence";
import { createPromptUsageRecord } from "./prompt-assets";
import type { ProviderJob } from "./provider-job-manager";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

describe("live image queue retry slide evidence", () => {
  test("blocks retry provenance whose slide number differs from the retried job output", () => {
    // Given
    const result = readyQueueResult({
      jobs: [job({ id: "job_retry", attempt: 2, output: generatedSlide(2) })],
      slides: [generatedSlide(2)],
      promptUsages: [
        createPromptUsageRecord({
          promptId: "slide_generation",
          artifactId: "bundle_slide_002",
          jobId: "job_retry",
          recordedAt: 1_789_700_000,
        }),
      ],
      retryProvenance: [
        {
          jobId: "job_retry",
          bundleId: "bundle_slide_002",
          slideNumber: 5,
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
    expect(issueCodes(validation)).toEqual(["retry_slide_mismatch"]);
  });
});

function issueCodes(
  validation: ReturnType<typeof evaluateLiveImageQueueEvidence>,
): readonly LiveImageQueueEvidenceIssueCode[] {
  return validation.kind === "blocked" ? validation.issues.map((issue) => issue.code) : [];
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
    progress: { completed: 5, failed: 0, total: 5, percent: 100 },
    ...overrides,
  };
}

function job(overrides: Partial<ProviderJob<GeneratedSlide>>): ProviderJob<GeneratedSlide> {
  return {
    id: "job_live",
    providerId: "openaiImage",
    capability: "imageGeneration",
    description: "Generate slide",
    status: "succeeded",
    createdAt: 1_789_700_000,
    attempt: 1,
    cancelRequested: false,
    ...overrides,
  };
}

function generatedSlide(number: number): GeneratedSlide {
  return {
    number,
    version: 1,
    status: "ready",
    imageDescriptor: "openaiImage|16:9|slide_layout.png|slide_generation@v1",
    notes: "Generated background.",
  };
}
