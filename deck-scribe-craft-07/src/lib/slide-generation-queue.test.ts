import { describe, expect, test } from "bun:test";
import type { DeckProject, GeneratedSlide } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { createProviderJobManager } from "./provider-job-manager";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { runSlideGenerationQueue } from "./slide-generation-queue";

describe("slide generation queue", () => {
  test("runs slide jobs in a bounded parallel queue with shared context", async () => {
    const bundles = approvedBundles();
    const progressEvents: number[] = [];
    let active = 0;
    let maxActive = 0;

    const result = await runSlideGenerationQueue({
      bundles,
      manager: createProviderJobManager({ createId: sequentialIds("job_slide") }),
      maxParallel: 2,
      onProgress: (progress) => progressEvents.push(progress.percent),
      generateSlide: async (input) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        expect(input.deckContextId).toBe(bundles[0]?.deckContextId);
        expect(input.deckContextHash).toBe(bundles[0]?.deckContextHash);
        expect(input.layoutPrototypeId).toBe(bundles[0]?.layoutPrototype.layoutPrototypeId);
        await delay();
        active -= 1;
        return generatedSlide(input.bundle.slideSpec.slideNumber);
      },
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("succeeded");
    expect(result.slides.length).toBe(8);
    expect(result.jobs.length).toBe(8);
    expect(maxActive).toBe(2);
    expect(progressEvents.at(-1)).toBe(100);
    expect(result.promptUsages.every((usage) => usage.promptVersion === "v1")).toBe(true);
  });

  test("keeps successful slides and exposes retryable partial failures", async () => {
    const result = await runSlideGenerationQueue({
      bundles: approvedBundles(),
      manager: createProviderJobManager({ createId: sequentialIds("job_partial") }),
      maxParallel: 3,
      generateSlide: async (input) => {
        if (input.bundle.slideSpec.slideNumber === 3) {
          throw new TypeError("provider rejected slide 3");
        }
        return generatedSlide(input.bundle.slideSpec.slideNumber);
      },
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("partial_failure");
    expect(result.slides.length).toBe(7);
    expect(result.failures).toEqual([
      {
        jobId: "job_partial_3",
        bundleId: result.failures[0]?.bundleId,
        slideNumber: 3,
        retryable: true,
        attempts: 1,
        failureKind: "unknown",
        retryDelaysMs: [],
        errorMessage: "provider rejected slide 3",
        userMessage: "Slide 3 failed: provider rejected slide 3. Retry is available.",
      },
    ]);
    expect(result.progress.percent).toBe(100);
  });

  test("normalizes invalid parallel limits to the default finite throttle", async () => {
    const bundles = approvedBundles();
    let active = 0;
    let maxActive = 0;

    const result = await runSlideGenerationQueue({
      bundles,
      manager: createProviderJobManager({ createId: sequentialIds("job_invalid_parallel") }),
      maxParallel: Number.POSITIVE_INFINITY,
      generateSlide: async (input) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await delay();
        active -= 1;
        return generatedSlide(input.bundle.slideSpec.slideNumber);
      },
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("succeeded");
    expect(maxActive).toBe(3);
  });

  test("blocks queue execution when bundles do not share frozen context", async () => {
    const bundles = approvedBundles();
    const first = bundles[0];
    const second = bundles[1];
    if (!first || !second) throw new Error("Expected approved bundle fixture.");

    const result = await runSlideGenerationQueue({
      bundles: [first, { ...second, deckContextHash: "sha256:changed" }],
      generateSlide: async (input) => generatedSlide(input.bundle.slideSpec.slideNumber),
    });

    expect(result).toEqual({
      kind: "blocked",
      issues: ["All slide jobs must share one Deck Context hash."],
    });
  });
});

function approvedBundles(): readonly SlideContextBundle[] {
  const project = approvedProject();
  const contextResult = createFrozenDeckContext(project, { now: () => 1_789_500_000 });
  if (contextResult.kind !== "ready") throw new Error("Expected approved fixture context.");
  const bundleResult = buildSlideContextBundles({
    project,
    context: contextResult.context,
  });
  if (bundleResult.kind !== "ready") throw new Error("Expected slide bundles.");
  return bundleResult.bundles;
}

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Slide generation queue deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Slide Generation Queue",
    initialPrompt: "Create a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
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

async function delay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 2));
}
