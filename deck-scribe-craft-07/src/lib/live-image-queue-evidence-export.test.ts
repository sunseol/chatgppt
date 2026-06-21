import { describe, expect, test } from "bun:test";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import { writeLiveImageQueueEvidenceExport } from "./live-image-queue-evidence-export";
import { createPromptUsageRecord } from "./prompt-assets";
import type { SlideGenerationQueueResult } from "./slide-generation-queue";

describe("live image queue evidence export", () => {
  test("persists a DF-233 queue evidence JSON bundle with retry cancel and resume fields", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const stored = await writeLiveImageQueueEvidenceExport({
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      projectId: "project_001",
      jobId: "job_generate_001",
      exportedAt: 1_789_940_001,
      result: readyQueueResult(),
      storedImageArtifactPaths: ["projects/project_001/slides/images/slide_001.v1.png"],
    });

    // Then
    expect(stored.path).toBe(
      "projects/project_001/live-evidence/df233-image-queue-job_generate_001.json",
    );
    expect(writes.map((write) => write.path)).toEqual([stored.path]);
    const content = writes[0]?.content;
    if (typeof content !== "string") throw new Error("Expected text evidence JSON.");
    expect(content.includes('"issue": "DF-233"')).toBe(true);
    expect(stored.evidence.issue).toBe("DF-233");
    expect(stored.evidence.resultStatus).toBe("partial_failure");
    expect(stored.evidence.retryProvenance.length).toBe(1);
    expect(stored.evidence.failures[0]?.failureKind).toBe("cancelled");
    expect(stored.evidence.validation.kind).toBe("blocked");
    if (stored.evidence.validation.kind !== "blocked") {
      throw new Error("Expected invalid closure evidence to remain blocked.");
    }
    expect(
      stored.evidence.validation.issues.map((issue) => issue.code).includes("retry_job_not_found"),
    ).toBe(true);
    expect(stored.evidence.storedImageArtifactPaths).toEqual([
      "projects/project_001/slides/images/slide_001.v1.png",
    ]);
    expect(stored.evidence.jobs.map((job) => job.id)).toEqual(["slide_job_1"]);
  });
});

function readyQueueResult(): Extract<SlideGenerationQueueResult, { readonly kind: "ready" }> {
  return {
    kind: "ready",
    status: "partial_failure",
    context: {
      deckContextId: "deckctx_001",
      deckContextHash: "sha256:deck",
      designSystemId: "design_001",
      designTokenHash: "sha256:design",
      layoutPrototypeId: "layout_001",
      slideCount: 2,
    },
    slides: [
      {
        number: 1,
        version: 1,
        status: "ready",
        imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
        notes: "projects/project_001/slides/images/slide_001.v1.png",
      },
    ],
    failures: [
      {
        jobId: "slide_job_2",
        bundleId: "bundle_slide_002",
        slideNumber: 2,
        retryable: false,
        attempts: 1,
        failureKind: "cancelled",
        retryDelaysMs: [],
        errorMessage: "Cancelled after user request.",
        userMessage: "Slide 2 image generation was cancelled.",
      },
    ],
    jobs: [
      {
        id: "slide_job_1",
        providerId: "codex",
        capability: "imageGeneration",
        description: "Generate slide 1",
        status: "succeeded",
        createdAt: 1_789_940_000,
        startedAt: 1_789_940_001,
        finishedAt: 1_789_940_010,
        attempt: 1,
        cancelRequested: false,
      },
    ],
    promptUsages: [
      createPromptUsageRecord({
        promptId: "slide_generation",
        artifactId: "bundle_slide_001",
        jobId: "slide_job_1",
        recordedAt: 1_789_940_000,
      }),
    ],
    retryProvenance: [
      {
        jobId: "slide_job_2",
        bundleId: "bundle_slide_002",
        attempt: 1,
        slideNumber: 2,
        failureKind: "rate_limit",
        delayMs: 1_000,
        message: "Rate limit, retrying.",
      },
    ],
    concurrency: {
      requestedMaxParallel: 3,
      effectiveMaxParallel: 2,
      observedMaxRunning: 2,
    },
    progress: { completed: 1, failed: 1, total: 2, percent: 100 },
  };
}
