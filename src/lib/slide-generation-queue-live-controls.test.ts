import { describe, expect, test } from "bun:test";
import type { DeckProject, GeneratedSlide } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import { ImageProviderRequestError } from "./image-provider-errors";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { createProviderJobManager } from "./provider-job-manager";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { runSlideGenerationQueue } from "./slide-generation-queue";

describe("slide generation queue live controls", () => {
  test("retries transient image failures with bounded backoff", async () => {
    // Given
    const bundles = approvedBundles(1);
    const retryDelays: number[] = [];
    let attempts = 0;

    // When
    const result = await runSlideGenerationQueue({
      bundles,
      manager: createProviderJobManager({ createId: sequentialIds("job_retry") }),
      retryPolicy: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 250 },
      waitForRetry: async (delayMs) => {
        retryDelays.push(delayMs);
      },
      generateSlide: async (input) => {
        attempts += 1;
        if (input.attempt < 3) {
          throw new ImageProviderRequestError("rate_limit", "rate limit");
        }
        return generatedSlide(input.bundle.slideSpec.slideNumber);
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("succeeded");
    expect(attempts).toBe(3);
    expect(retryDelays).toEqual([100, 200]);
    expect(result.jobs[0]?.attempt).toBe(3);
    expect(result.retryProvenance).toEqual([
      {
        jobId: "job_retry_1",
        bundleId: result.retryProvenance[0]?.bundleId,
        slideNumber: 1,
        attempt: 1,
        delayMs: 100,
        failureKind: "rate_limit",
        message: "rate limit",
      },
      {
        jobId: "job_retry_1",
        bundleId: result.retryProvenance[1]?.bundleId,
        slideNumber: 1,
        attempt: 2,
        delayMs: 200,
        failureKind: "rate_limit",
        message: "rate limit",
      },
    ]);
    expect(result.failures).toEqual([]);
  });

  test("stops 5xx retries at the maximum attempt and records retry provenance", async () => {
    // Given
    const bundles = approvedBundles(1);
    const retryEvents: string[] = [];
    let attempts = 0;

    // When
    const result = await runSlideGenerationQueue({
      bundles,
      manager: createProviderJobManager({ createId: sequentialIds("job_5xx") }),
      retryPolicy: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 250 },
      waitForRetry: async (_delayMs, event) => {
        retryEvents.push(`${event.failureKind}:${event.delayMs}`);
      },
      generateSlide: async () => {
        attempts += 1;
        throw new ImageProviderRequestError("server", "upstream 503");
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("failed");
    expect(attempts).toBe(3);
    expect(retryEvents).toEqual(["server:100", "server:200"]);
    expect(result.failures).toEqual([
      {
        jobId: "job_5xx_1",
        bundleId: result.failures[0]?.bundleId,
        slideNumber: 1,
        retryable: true,
        attempts: 3,
        failureKind: "server",
        retryDelaysMs: [100, 200],
        errorMessage: "upstream 503",
        userMessage: "Slide 1 failed: upstream 503. Retry is available.",
      },
    ]);
    expect(result.jobs[0]?.attempt).toBe(3);
  });

  test("keeps completed images when resuming a partial queue", async () => {
    // Given
    const completedSlides = [generatedSlide(1), generatedSlide(2)];
    const generatedNumbers: number[] = [];

    // When
    const result = await runSlideGenerationQueue({
      bundles: approvedBundles(5),
      completedSlides,
      manager: createProviderJobManager({ createId: sequentialIds("job_resume") }),
      generateSlide: async (input) => {
        generatedNumbers.push(input.bundle.slideSpec.slideNumber);
        return generatedSlide(input.bundle.slideSpec.slideNumber);
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("succeeded");
    expect(generatedNumbers).toEqual([3, 4, 5]);
    expect(result.slides.map((slide) => slide.number)).toEqual([1, 2, 3, 4, 5]);
    expect(result.jobs.length).toBe(3);
    expect(result.progress).toEqual({ completed: 5, failed: 0, total: 5, percent: 100 });
  });

  test("records cancellation without invoking later provider calls", async () => {
    // Given
    const generatedNumbers: number[] = [];

    // When
    const result = await runSlideGenerationQueue({
      bundles: approvedBundles(4),
      manager: createProviderJobManager({ createId: sequentialIds("job_cancel") }),
      maxParallel: 1,
      isCancellationRequested: () => generatedNumbers.length >= 1,
      generateSlide: async (input) => {
        generatedNumbers.push(input.bundle.slideSpec.slideNumber);
        return generatedSlide(input.bundle.slideSpec.slideNumber);
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("partial_failure");
    expect(generatedNumbers).toEqual([1]);
    expect(result.failures.map((failure) => failure.slideNumber)).toEqual([2, 3, 4]);
    expect(result.failures.every((failure) => failure.failureKind === "cancelled")).toBe(true);
    expect(result.jobs.filter((job) => job.status === "cancelled").length).toBe(3);
  });
});

function approvedBundles(slideCount: number): readonly SlideContextBundle[] {
  const project = approvedProject(slideCount);
  const contextResult = createFrozenDeckContext(project, { now: () => 1_789_500_000 });
  if (contextResult.kind !== "ready") throw new Error("Expected approved fixture context.");
  const bundleResult = buildSlideContextBundles({
    project,
    context: contextResult.context,
  });
  if (bundleResult.kind !== "ready") throw new Error("Expected slide bundles.");
  return bundleResult.bundles;
}

function approvedProject(slideCount: number): DeckProject {
  const brief = {
    ...mockBrief("Slide generation live queue controls", slideCount, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Slide Generation Live Queue Controls",
    initialPrompt: "Create a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount,
    stage: "GENERATING_SLIDES",
    createdAt: 1_789_500_000,
    updatedAt: 1_789_500_000,
    brief,
    research,
    plan,
    design,
    layout,
    invalidated: {},
    approvalLog: [],
  };
}

function generatedSlide(slideNumber: number): GeneratedSlide {
  return {
    number: slideNumber,
    version: 1,
    status: "ready",
    imageDescriptor: `generated slide ${slideNumber}`,
  };
}

function sequentialIds(prefix: string): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `${prefix}_${next}`;
  };
}
