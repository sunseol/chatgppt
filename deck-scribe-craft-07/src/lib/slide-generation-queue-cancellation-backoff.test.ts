import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import { ImageProviderRequestError } from "./image-provider-errors";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { createProviderJobManager } from "./provider-job-manager";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { runSlideGenerationQueue } from "./slide-generation-queue";

describe("slide generation queue cancellation during retry backoff", () => {
  test("cancels during retry backoff without starting the next attempt", async () => {
    // Given
    const bundles = approvedBundles(1);
    let cancelled = false;
    const retryAttempts: number[] = [];

    // When
    const result = await runSlideGenerationQueue({
      bundles,
      manager: createProviderJobManager({ createId: sequentialIds("job_backoff_cancel") }),
      retryPolicy: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 250 },
      waitForRetry: async (_delayMs, event) => {
        retryAttempts.push(event.attempt);
        cancelled = true;
      },
      isCancellationRequested: () => cancelled,
      generateSlide: async () => {
        throw new ImageProviderRequestError("rate_limit", "rate limit");
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("failed");
    expect(retryAttempts).toEqual([1]);
    expect(result.jobs[0]?.attempt).toBe(1);
    expect(result.failures).toEqual([
      {
        jobId: "job_backoff_cancel_1",
        bundleId: result.failures[0]?.bundleId,
        slideNumber: 1,
        retryable: true,
        attempts: 1,
        failureKind: "cancelled",
        retryDelaysMs: [100],
        errorMessage: 'Provider job "job_backoff_cancel_1" was cancelled.',
        userMessage: "Slide 1 was cancelled. Retry is available.",
      },
    ]);
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
    ...mockBrief("Slide generation backoff cancellation", slideCount, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Slide Generation Backoff Cancellation",
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

function sequentialIds(prefix: string): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `${prefix}_${next}`;
  };
}
