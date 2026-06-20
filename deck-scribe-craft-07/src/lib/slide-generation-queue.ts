import type { GeneratedSlide } from "./deck-types";
import { hashContent } from "./artifacts";
import { createPromptUsageRecord, type PromptUsageRecord } from "./prompt-assets";
import { createProviderJobManager, type ProviderJobManager } from "./provider-job-manager";
import type { SlideContextBundle } from "./slide-context-bundle";
import { createSlideGenerationQueueConcurrencyTracker } from "./slide-generation-queue-concurrency";
import {
  runSlideGenerationTask,
  type SlideGenerationQueueTask,
} from "./slide-generation-queue-executor";
import type {
  RunSlideGenerationQueueInput,
  SlideGenerationFailure,
  SlideGenerationQueueContext,
  SlideGenerationQueueProgress,
  SlideGenerationQueueResult,
  SlideGenerationRetryProvenance,
  SlideGenerationWorkerInput,
} from "./slide-generation-queue-types";

const DEFAULT_MAX_PARALLEL = 3;

export type {
  RunSlideGenerationQueueInput,
  SlideGenerationFailure,
  SlideGenerationQueueContext,
  SlideGenerationQueueProgress,
  SlideGenerationQueueResult,
  SlideGenerationWorkerInput,
} from "./slide-generation-queue-types";

export async function runSlideGenerationQueue(
  input: RunSlideGenerationQueueInput,
): Promise<SlideGenerationQueueResult> {
  const contextResult = createQueueContext(input.bundles);
  if (contextResult.kind === "blocked") return contextResult;
  const queueContext = contextResult.context;

  const manager = input.manager ?? createProviderJobManager({ createId: queueJobIds() });
  const completedSlides = completedSlidesForBundles(input.bundles, input.completedSlides ?? []);
  const pendingBundles = pendingBundlesForCompletedSlides(input.bundles, completedSlides);
  const tasks = pendingBundles.map((bundle) => createTask(bundle, manager, input.providerId));
  const progress = createProgressTracker(
    input.bundles.length,
    input.onProgress,
    completedSlides.length,
  );
  const slides: GeneratedSlide[] = [...completedSlides];
  const failures: SlideGenerationFailure[] = [];
  const retryProvenance: SlideGenerationRetryProvenance[] = [];
  let cursor = 0;
  const requestedMaxParallel = normalizeRequestedWorkerLimit(input.maxParallel);
  const workerCount = normalizeWorkerCount(requestedMaxParallel, tasks.length);
  const concurrency = createSlideGenerationQueueConcurrencyTracker({
    requestedMaxParallel,
    effectiveMaxParallel: workerCount,
  });

  async function runWorker(): Promise<void> {
    for (;;) {
      const task = tasks[cursor];
      cursor += 1;
      if (!task) return;
      concurrency.start();
      let result;
      try {
        result = await runSlideGenerationTask({
          task,
          context: queueContext,
          generateSlide: input.generateSlide,
          manager,
          options: {
            isCancellationRequested: input.isCancellationRequested,
            retryPolicy: input.retryPolicy,
            waitForRetry: input.waitForRetry,
          },
        });
      } finally {
        concurrency.finish();
      }
      if (result.kind === "succeeded") slides.push(result.slide);
      else failures.push(result.failure);
      retryProvenance.push(...result.retryProvenance);
      progress.mark(result.kind === "succeeded");
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return {
    kind: "ready",
    status: queueStatus(slides.length, failures.length),
    context: queueContext,
    slides: [...slides].sort((left, right) => left.number - right.number),
    failures,
    jobs: manager.snapshot(),
    promptUsages: tasks.map((task) => task.promptUsage),
    retryProvenance,
    concurrency: concurrency.evidence(),
    progress: progress.current(),
  };
}

function createQueueContext(bundles: readonly SlideContextBundle[]):
  | { readonly kind: "ready"; readonly context: SlideGenerationQueueContext }
  | {
      readonly kind: "blocked";
      readonly issues: readonly string[];
    } {
  const first = bundles[0];
  if (!first)
    return { kind: "blocked", issues: ["At least one slide context bundle is required."] };

  const context: SlideGenerationQueueContext = {
    deckContextId: first.deckContextId,
    deckContextHash: first.deckContextHash,
    designSystemId: first.designSystemId,
    designTokenHash: designTokenHash(first),
    layoutPrototypeId: first.layoutPrototype.layoutPrototypeId,
    slideCount: bundles.length,
  };
  const issues: string[] = [];
  if (bundles.some((bundle) => bundle.deckContextId !== context.deckContextId)) {
    issues.push("All slide jobs must share one Deck Context id.");
  }
  if (bundles.some((bundle) => bundle.deckContextHash !== context.deckContextHash)) {
    issues.push("All slide jobs must share one Deck Context hash.");
  }
  if (bundles.some((bundle) => bundle.designSystemId !== context.designSystemId)) {
    issues.push("All slide jobs must share one Design System id.");
  }
  if (bundles.some((bundle) => designTokenHash(bundle) !== context.designTokenHash)) {
    issues.push("All slide jobs must share one Design System hash.");
  }
  if (
    bundles.some((bundle) => bundle.layoutPrototype.layoutPrototypeId !== context.layoutPrototypeId)
  ) {
    issues.push("All slide jobs must share one HTML Layout Prototype id.");
  }
  return issues.length > 0 ? { kind: "blocked", issues } : { kind: "ready", context };
}

function createTask(
  bundle: SlideContextBundle,
  manager: ProviderJobManager,
  providerId = "slide-generation-queue",
): SlideGenerationQueueTask {
  const job = manager.enqueue({
    providerId,
    capability: "imageGeneration",
    description: `Generate slide ${bundle.slideSpec.slideNumber}`,
  });
  return {
    bundle,
    job,
    promptUsage: createPromptUsageRecord({
      promptId: "slide_generation",
      artifactId: bundle.bundleId,
      jobId: job.id,
    }),
  };
}

function createProgressTracker(
  total: number,
  onProgress?: (progress: SlideGenerationQueueProgress) => void,
  initialCompleted = 0,
) {
  let completed = initialCompleted;
  let failed = 0;
  return {
    mark(succeeded: boolean) {
      if (succeeded) completed += 1;
      else failed += 1;
      onProgress?.(currentProgress(completed, failed, total));
    },
    current() {
      return currentProgress(completed, failed, total);
    },
  };
}

function currentProgress(
  completed: number,
  failed: number,
  total: number,
): SlideGenerationQueueProgress {
  return {
    completed,
    failed,
    total,
    percent: total === 0 ? 100 : Math.round(((completed + failed) / total) * 100),
  };
}

function queueStatus(
  completedCount: number,
  failureCount: number,
): "succeeded" | "partial_failure" | "failed" {
  if (failureCount === 0) return "succeeded";
  return completedCount === 0 ? "failed" : "partial_failure";
}

function normalizeWorkerCount(requestedMaxParallel: number, taskCount: number): number {
  if (taskCount === 0) return 0;
  return Math.min(requestedMaxParallel, taskCount);
}

function normalizeRequestedWorkerLimit(maxParallel: number | undefined): number {
  const requested =
    maxParallel === undefined || !Number.isFinite(maxParallel)
      ? DEFAULT_MAX_PARALLEL
      : Math.floor(maxParallel);
  return Math.max(1, requested);
}

function designTokenHash(bundle: SlideContextBundle): string {
  return hashContent(JSON.stringify(bundle.designTokens));
}

function completedSlidesForBundles(
  bundles: readonly SlideContextBundle[],
  completedSlides: readonly GeneratedSlide[],
): readonly GeneratedSlide[] {
  const completedBySlide = new Map(completedSlides.map((slide) => [slide.number, slide]));
  return bundles.flatMap((bundle) => {
    const slide = completedBySlide.get(bundle.slideSpec.slideNumber);
    return slide && isCompletedGeneratedSlideForBundle(slide, bundle) ? [slide] : [];
  });
}

function isCompletedGeneratedSlideForBundle(
  slide: GeneratedSlide,
  bundle: SlideContextBundle,
): boolean {
  return (
    (slide.status === "ready" || slide.status === "approved") &&
    completedDescriptorMatchesBundle(slide.imageDescriptor, bundle)
  );
}

function completedDescriptorMatchesBundle(descriptor: string, bundle: SlideContextBundle): boolean {
  const [providerId, aspectRatio, layoutScreenshot, promptVersion, extra] = descriptor.split("|");
  return (
    extra === undefined &&
    isLiveImageProviderId(providerId) &&
    aspectRatio === "16:9" &&
    layoutScreenshot === bundle.layoutPrototype.layoutScreenshot &&
    promptVersion === "slide_generation@v1"
  );
}

function isLiveImageProviderId(providerId: string | undefined): boolean {
  return providerId === "openaiImage" || providerId === "codex";
}

function pendingBundlesForCompletedSlides(
  bundles: readonly SlideContextBundle[],
  completedSlides: readonly GeneratedSlide[],
): readonly SlideContextBundle[] {
  const completedSlideNumbers = new Set(completedSlides.map((slide) => slide.number));
  return bundles.filter((bundle) => !completedSlideNumbers.has(bundle.slideSpec.slideNumber));
}

function queueJobIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `slide_job_${next}`;
  };
}
