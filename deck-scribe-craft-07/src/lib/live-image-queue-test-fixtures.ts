import type { GeneratedSlide } from "./deck-types";
import type { ProviderJob } from "./provider-job-manager";
import type { SlideGenerationQueueResult } from "./slide-generation-queue-types";

type ReadyQueueResult = Extract<SlideGenerationQueueResult, { readonly kind: "ready" }>;

export function readyQueueResultFixture(
  overrides: Partial<ReadyQueueResult> = {},
): SlideGenerationQueueResult {
  const context = overrides.context ?? {
    deckContextId: "deck_context_live",
    deckContextHash: "sha256:context",
    designSystemId: "design_live",
    designTokenHash: "sha256:design",
    layoutPrototypeId: "layout_live",
    slideCount: 5,
  };
  const failures = overrides.failures ?? [];
  const slides = overrides.slides ?? generatedSlidesFixture(context.slideCount - failures.length);
  const progress = overrides.progress ?? {
    completed: slides.length,
    failed: failures.length,
    total: context.slideCount,
    percent: 100,
  };
  const status = overrides.status ?? queueStatus(slides.length, failures.length);
  return {
    kind: "ready",
    status,
    context,
    slides,
    failures,
    jobs: [],
    promptUsages: [],
    retryProvenance: [],
    concurrency: { requestedMaxParallel: 3, effectiveMaxParallel: 3, observedMaxRunning: 0 },
    progress,
    ...overrides,
  };
}

export function generatedSlidesFixture(count: number): readonly GeneratedSlide[] {
  return Array.from({ length: count }, (_, index) => generatedSlideFixture(index + 1));
}

export function generatedSlideFixture(number: number): GeneratedSlide {
  return {
    number,
    version: 1,
    status: "ready",
    imageDescriptor: `Slide ${number}`,
  };
}

export function providerJobFixture(overrides: Partial<ProviderJob>): ProviderJob {
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

function queueStatus(completedCount: number, failureCount: number): ReadyQueueResult["status"] {
  if (failureCount === 0) return "succeeded";
  return completedCount === 0 ? "failed" : "partial_failure";
}
