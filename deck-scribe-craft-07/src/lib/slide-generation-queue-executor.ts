import type { GeneratedSlide } from "./deck-types";
import { ImageProviderRequestError } from "./image-provider-errors";
import type { PromptUsageRecord } from "./prompt-assets";
import {
  ProviderJobCancelledError,
  type ProviderJob,
  type ProviderJobManager,
} from "./provider-job-manager";
import {
  decideSlideGenerationRetry,
  waitForSlideGenerationRetryDelay,
  type SlideGenerationRetryEvent,
} from "./slide-generation-retry-policy";
import type { SlideContextBundle } from "./slide-context-bundle";
import type {
  RunSlideGenerationQueueInput,
  SlideGenerationFailure,
  SlideGenerationQueueContext,
  SlideGenerationRetryProvenance,
  SlideGenerationWorkerInput,
} from "./slide-generation-queue-types";

export interface SlideGenerationQueueTask {
  readonly bundle: SlideContextBundle;
  readonly job: ProviderJob;
  readonly promptUsage: PromptUsageRecord;
}

export type SlideGenerationTaskResult =
  | {
      readonly kind: "succeeded";
      readonly slide: GeneratedSlide;
      readonly retryProvenance: readonly SlideGenerationRetryProvenance[];
    }
  | {
      readonly kind: "failed";
      readonly failure: SlideGenerationFailure;
      readonly retryProvenance: readonly SlideGenerationRetryProvenance[];
    };

export async function runSlideGenerationTask(input: {
  readonly task: SlideGenerationQueueTask;
  readonly context: SlideGenerationQueueContext;
  readonly generateSlide: (input: SlideGenerationWorkerInput) => Promise<GeneratedSlide>;
  readonly manager: ProviderJobManager;
  readonly options: Pick<
    RunSlideGenerationQueueInput,
    "isCancellationRequested" | "retryPolicy" | "waitForRetry"
  >;
}): Promise<SlideGenerationTaskResult> {
  const retryDelaysMs: number[] = [];
  const retryProvenance: SlideGenerationRetryProvenance[] = [];

  for (;;) {
    if (input.options.isCancellationRequested?.() === true) {
      return cancelTask(input.task, input.manager, retryDelaysMs, retryProvenance);
    }

    const currentJob = input.manager.get(input.task.job.id) ?? input.task.job;
    let capturedError: unknown;
    const completed = await input.manager.run(currentJob.id, async (job) => {
      if (job.isCancellationRequested() || input.options.isCancellationRequested?.() === true) {
        throw new ProviderJobCancelledError(currentJob.id);
      }
      try {
        const slide = await input.generateSlide({
          bundle: input.task.bundle,
          deckContextId: input.context.deckContextId,
          deckContextHash: input.context.deckContextHash,
          designSystemId: input.context.designSystemId,
          designTokenHash: input.context.designTokenHash,
          layoutPrototypeId: input.context.layoutPrototypeId,
          promptUsage: input.task.promptUsage,
          attempt: currentJob.attempt,
        });
        if (job.isCancellationRequested()) {
          throw new ProviderJobCancelledError(currentJob.id);
        }
        return slide;
      } catch (error) {
        capturedError = error;
        throw error;
      }
    });

    if (completed.status === "succeeded" && completed.output !== undefined) {
      return { kind: "succeeded", slide: completed.output, retryProvenance };
    }
    if (completed.status === "cancelled") {
      return {
        kind: "failed",
        failure: createCancelledFailure(input.task, completed, retryDelaysMs),
        retryProvenance,
      };
    }

    const decision = decideSlideGenerationRetry(
      capturedError ?? fallbackImageProviderError(completed.errorMessage),
      currentJob.attempt,
      input.options.retryPolicy,
    );
    if (!decision.shouldRetry) {
      return {
        kind: "failed",
        failure: createProviderFailure(input.task, completed, decision, retryDelaysMs),
        retryProvenance,
      };
    }

    retryDelaysMs.push(decision.delayMs);
    const retryEvent = {
      jobId: currentJob.id,
      bundleId: input.task.bundle.bundleId,
      slideNumber: input.task.bundle.slideSpec.slideNumber,
      attempt: currentJob.attempt,
      delayMs: decision.delayMs,
      failureKind: decision.failureKind,
      message: decision.message,
    };
    retryProvenance.push(retryEvent);
    await waitForRetry(input.options.waitForRetry, retryEvent);
    if (input.options.isCancellationRequested?.() === true) {
      return cancelTask(input.task, input.manager, retryDelaysMs, retryProvenance);
    }
    input.manager.retry(currentJob.id);
  }
}

function createProviderFailure(
  task: SlideGenerationQueueTask,
  completed: ProviderJob<GeneratedSlide>,
  decision: ReturnType<typeof decideSlideGenerationRetry>,
  retryDelaysMs: readonly number[],
): SlideGenerationFailure {
  const slideNumber = task.bundle.slideSpec.slideNumber;
  return {
    jobId: task.job.id,
    bundleId: task.bundle.bundleId,
    slideNumber,
    retryable: decision.retryable,
    attempts: completed.attempt,
    failureKind: decision.failureKind,
    retryDelaysMs,
    errorMessage: decision.message,
    userMessage: `Slide ${slideNumber} failed: ${decision.message}. Retry is available.`,
  };
}

async function cancelTask(
  task: SlideGenerationQueueTask,
  manager: ProviderJobManager,
  retryDelaysMs: readonly number[],
  retryProvenance: readonly SlideGenerationRetryProvenance[],
): Promise<SlideGenerationTaskResult> {
  manager.requestCancellation(task.job.id);
  const completed = await manager.run(task.job.id, async () => {
    throw new ProviderJobCancelledError(task.job.id);
  });
  return {
    kind: "failed",
    failure: createCancelledFailure(task, completed, retryDelaysMs),
    retryProvenance,
  };
}

function createCancelledFailure(
  task: SlideGenerationQueueTask,
  completed: ProviderJob<GeneratedSlide>,
  retryDelaysMs: readonly number[],
): SlideGenerationFailure {
  const slideNumber = task.bundle.slideSpec.slideNumber;
  return {
    jobId: task.job.id,
    bundleId: task.bundle.bundleId,
    slideNumber,
    retryable: true,
    attempts: completed.attempt,
    failureKind: "cancelled",
    retryDelaysMs,
    errorMessage: completed.errorMessage ?? `Slide ${slideNumber} generation was cancelled.`,
    userMessage: `Slide ${slideNumber} was cancelled. Retry is available.`,
  };
}

function fallbackImageProviderError(message: string | undefined): ImageProviderRequestError {
  return new ImageProviderRequestError("unknown", message ?? "Unknown image provider failure.");
}

async function waitForRetry(
  waitForRetry: RunSlideGenerationQueueInput["waitForRetry"],
  event: SlideGenerationRetryEvent,
): Promise<void> {
  if (waitForRetry) {
    await waitForRetry(event.delayMs, event);
    return;
  }
  await waitForSlideGenerationRetryDelay(event.delayMs);
}
