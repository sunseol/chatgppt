import { describe, expect, test } from "bun:test";
import type { DeckProject, GeneratedSlide } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import {
  evaluateLiveImageQueueEvidence,
  type LiveImageQueueEvidenceValidation,
} from "./live-image-queue-evidence";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { runSlideGenerationQueue } from "./slide-generation-queue";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

describe("live image queue concurrency evidence", () => {
  test("blocks otherwise valid queue evidence without observed concurrency proof", () => {
    // Given
    const result = readyQueueResult();

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["missing_concurrency_evidence"]);
  });

  test("blocks queue evidence whose observed concurrency exceeds the effective limit", () => {
    // Given
    const result = readyQueueResult({
      concurrency: { requestedMaxParallel: 2, effectiveMaxParallel: 2, observedMaxRunning: 3 },
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["concurrency_limit_exceeded"]);
  });

  test("blocks queue evidence whose effective limit is zero", () => {
    // Given
    const result = readyQueueResult({
      concurrency: { requestedMaxParallel: 0, effectiveMaxParallel: 0, observedMaxRunning: 0 },
    });

    // When
    const validation = evaluateLiveImageQueueEvidence(result);

    // Then
    expect(issueCodes(validation)).toEqual(["invalid_concurrency_evidence"]);
  });

  test("records observed concurrency from the live queue throttle", async () => {
    // Given
    let activeCalls = 0;
    let observedMaxCalls = 0;

    // When
    const result = await runSlideGenerationQueue({
      bundles: approvedBundles(4),
      maxParallel: 2,
      generateSlide: async (input) => {
        activeCalls += 1;
        observedMaxCalls = Math.max(observedMaxCalls, activeCalls);
        await Promise.resolve();
        activeCalls -= 1;
        return generatedSlide(input.bundle.slideSpec.slideNumber);
      },
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(observedMaxCalls).toBe(2);
    expect(result.concurrency).toEqual({
      requestedMaxParallel: 2,
      effectiveMaxParallel: 2,
      observedMaxRunning: 2,
    });
  });
});

function issueCodes(validation: LiveImageQueueEvidenceValidation): readonly string[] {
  return validation.kind === "blocked" ? validation.issues.map((issue) => issue.code) : [];
}

function readyQueueResult(
  overrides: Partial<Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>> = {},
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
    ...mockBrief("Slide generation concurrency evidence", slideCount, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Slide Generation Concurrency Evidence",
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
    imageDescriptor: `openaiImage|16:9|slide_${String(slideNumber).padStart(
      2,
      "0",
    )}_layout.png|slide_generation@v1`,
  };
}
