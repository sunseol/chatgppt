import { describe, expect, test } from "bun:test";
import type { DeckProject, GeneratedSlide } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { createProviderJobManager } from "./provider-job-manager";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { runSlideGenerationQueue } from "./slide-generation-queue";

describe("slide generation queue resume lineage", () => {
  test("keeps completed slides whose live codex descriptor matches the current bundle", async () => {
    // Given
    const bundles = approvedBundles(2);
    const generatedNumbers: number[] = [];

    // When
    const result = await runSlideGenerationQueue({
      bundles,
      completedSlides: [
        {
          ...generatedSlideForBundle(bundles[0]),
          imageDescriptor: `codex|16:9|${bundles[0].layoutPrototype.layoutScreenshot}|slide_generation@v1`,
        },
      ],
      manager: createProviderJobManager({ createId: sequentialIds("job_resume_codex_lineage") }),
      maxParallel: 1,
      generateSlide: async (input) => {
        generatedNumbers.push(input.bundle.slideSpec.slideNumber);
        return generatedSlideForBundle(input.bundle);
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(generatedNumbers).toEqual([2]);
    expect(result.jobs.map((job) => job.description)).toEqual(["Generate slide 2"]);
  });

  test("regenerates completed slides whose descriptor keeps the layout but changes prompt lineage", async () => {
    // Given
    const bundles = approvedBundles(2);
    const generatedNumbers: number[] = [];

    // When
    const result = await runSlideGenerationQueue({
      bundles,
      completedSlides: [
        {
          ...generatedSlideForBundle(bundles[0]),
          imageDescriptor: `openaiImage|16:9|${bundles[0].layoutPrototype.layoutScreenshot}|slide_generation@v0`,
        },
      ],
      manager: createProviderJobManager({ createId: sequentialIds("job_resume_prompt_lineage") }),
      maxParallel: 1,
      generateSlide: async (input) => {
        generatedNumbers.push(input.bundle.slideSpec.slideNumber);
        return generatedSlideForBundle(input.bundle);
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(generatedNumbers).toEqual([1, 2]);
    expect(result.jobs.map((job) => job.description)).toEqual([
      "Generate slide 1",
      "Generate slide 2",
    ]);
  });

  test("regenerates completed slides whose descriptor does not match the current layout reference", async () => {
    // Given
    const bundles = approvedBundles(2);
    const generatedNumbers: number[] = [];

    // When
    const result = await runSlideGenerationQueue({
      bundles,
      completedSlides: [
        {
          ...generatedSlideForBundle(bundles[0]),
          imageDescriptor: "openaiImage|16:9|stale_slide_01_layout.png|slide_generation@v1",
        },
      ],
      manager: createProviderJobManager({ createId: sequentialIds("job_resume_lineage") }),
      maxParallel: 1,
      generateSlide: async (input) => {
        generatedNumbers.push(input.bundle.slideSpec.slideNumber);
        return generatedSlideForBundle(input.bundle);
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(generatedNumbers).toEqual([1, 2]);
    expect(result.jobs.map((job) => job.description)).toEqual([
      "Generate slide 1",
      "Generate slide 2",
    ]);
  });
});

function approvedBundles(slideCount: number): readonly SlideContextBundle[] {
  const project = approvedProject(slideCount);
  const contextResult = createFrozenDeckContext(project, {
    now: () => 1_789_500_000,
  });
  if (contextResult.kind !== "ready") throw new Error("Expected approved fixture context.");
  const bundleResult = buildSlideContextBundles({
    project,
    context: contextResult.context,
  });
  if (bundleResult.kind !== "ready") throw new Error("Expected slide bundles.");
  return bundleResult.bundles;
}

function approvedProject(slideCount: number): DeckProject {
  const brief = { ...mockBrief("Queue resume lineage", slideCount, "16:9"), approvedHash: "b" };
  const research = { ...mockResearch(brief), approvedHash: "r" };
  const plan = { ...mockPlan(brief, research), approvedHash: "p" };
  const design = { ...mockDesign(brief, plan), approvedHash: "d" };
  return {
    id: "project_001",
    name: "Queue Resume Lineage",
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
    layout: { ...mockLayout(plan, design), approvedHash: "l" },
    invalidated: {},
    approvalLog: [],
  };
}

function generatedSlideForBundle(bundle: SlideContextBundle): GeneratedSlide {
  return {
    number: bundle.slideSpec.slideNumber,
    version: 1,
    status: "ready",
    imageDescriptor: `openaiImage|16:9|${bundle.layoutPrototype.layoutScreenshot}|slide_generation@v1`,
  };
}

function sequentialIds(prefix: string): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `${prefix}_${next}`;
  };
}
