import type { GeneratedSlide } from "./deck-types";
import { hashContent } from "./artifacts";
import { createPromptUsageRecord, type PromptUsageRecord } from "./prompt-assets";
import {
  createProviderJobManager,
  type ProviderJob,
  type ProviderJobManager,
} from "./provider-job-manager";
import type { SlideContextBundle } from "./slide-context-bundle";
import type {
  RunSlideGenerationQueueInput,
  SlideGenerationFailure,
  SlideGenerationQueueContext,
  SlideGenerationQueueProgress,
  SlideGenerationQueueResult,
  SlideGenerationWorkerInput,
} from "./slide-generation-queue-types";
export type {
  RunSlideGenerationQueueInput,
  SlideGenerationFailure,
  SlideGenerationQueueContext,
  SlideGenerationQueueProgress,
  SlideGenerationQueueResult,
  SlideGenerationWorkerInput,
} from "./slide-generation-queue-types";

interface SlideGenerationQueueTask {
  readonly bundle: SlideContextBundle;
  readonly job: ProviderJob;
  readonly promptUsage: PromptUsageRecord;
}

export async function runSlideGenerationQueue(
  input: RunSlideGenerationQueueInput,
): Promise<SlideGenerationQueueResult> {
  const contextResult = createQueueContext(input.bundles);
  if (contextResult.kind === "blocked") return contextResult;
  const queueContext = contextResult.context;

  const manager = input.manager ?? createProviderJobManager({ createId: queueJobIds() });
  const tasks = input.bundles.map((bundle) => createTask(bundle, manager, input.providerId));
  const progress = createProgressTracker(tasks.length, input.onProgress);
  const slides: GeneratedSlide[] = [];
  const failures: SlideGenerationFailure[] = [];
  let cursor = 0;

  async function runWorker(): Promise<void> {
    for (;;) {
      const task = tasks[cursor];
      cursor += 1;
      if (!task) return;
      await runTask(task, queueContext, input.generateSlide, manager, slides, failures, progress);
    }
  }

  const workerCount = Math.min(Math.max(1, input.maxParallel ?? 3), tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return {
    kind: "ready",
    status: queueStatus(slides.length, failures.length),
    context: queueContext,
    slides: [...slides].sort((left, right) => left.number - right.number),
    failures,
    jobs: manager.snapshot(),
    promptUsages: tasks.map((task) => task.promptUsage),
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

async function runTask(
  task: SlideGenerationQueueTask,
  context: SlideGenerationQueueContext,
  generateSlide: (input: SlideGenerationWorkerInput) => Promise<GeneratedSlide>,
  manager: ProviderJobManager,
  slides: GeneratedSlide[],
  failures: SlideGenerationFailure[],
  progress: ReturnType<typeof createProgressTracker>,
): Promise<void> {
  const completed = await manager.run(task.job.id, async (job) => {
    job.reportProgress({ percent: 10, message: "Preparing frozen slide context" });
    const slide = await generateSlide({
      bundle: task.bundle,
      deckContextId: context.deckContextId,
      deckContextHash: context.deckContextHash,
      designTokenHash: context.designTokenHash,
      layoutPrototypeId: context.layoutPrototypeId,
      promptUsage: task.promptUsage,
    });
    job.reportProgress({ percent: 100, message: "Slide generation completed" });
    return slide;
  });

  if (completed.status === "succeeded" && completed.output !== undefined) {
    slides.push(completed.output);
  } else {
    failures.push(createFailure(task, completed));
  }
  progress.mark(completed.status === "succeeded");
}

function createProgressTracker(
  total: number,
  onProgress?: (progress: SlideGenerationQueueProgress) => void,
) {
  let completed = 0;
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

function createFailure(
  task: SlideGenerationQueueTask,
  completed: ProviderJob<GeneratedSlide>,
): SlideGenerationFailure {
  const errorMessage = completed.errorMessage ?? "Slide generation failed.";
  const slideNumber = task.bundle.slideSpec.slideNumber;
  return {
    jobId: task.job.id,
    bundleId: task.bundle.bundleId,
    slideNumber,
    retryable: true,
    errorMessage,
    userMessage: `Slide ${slideNumber} failed: ${errorMessage}. Retry is available.`,
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

function designTokenHash(bundle: SlideContextBundle): string {
  return hashContent(JSON.stringify(bundle.designTokens));
}

function queueJobIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `slide_job_${next}`;
  };
}
