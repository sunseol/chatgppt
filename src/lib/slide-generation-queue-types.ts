import type { GeneratedSlide } from "./deck-types";
import type { PromptUsageRecord } from "./prompt-assets";
import type { ProviderJob, ProviderJobManager } from "./provider-job-manager";
import type { SlideContextBundle } from "./slide-context-bundle";

export interface SlideGenerationQueueContext {
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly designTokenHash: string;
  readonly layoutPrototypeId: string;
  readonly slideCount: number;
}

export interface SlideGenerationWorkerInput {
  readonly bundle: SlideContextBundle;
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly designTokenHash: string;
  readonly layoutPrototypeId: string;
  readonly promptUsage: PromptUsageRecord;
}

export interface SlideGenerationQueueProgress {
  readonly completed: number;
  readonly failed: number;
  readonly total: number;
  readonly percent: number;
}

export interface SlideGenerationFailure {
  readonly jobId: string;
  readonly bundleId: string;
  readonly slideNumber: number;
  readonly retryable: true;
  readonly errorMessage: string;
  readonly userMessage: string;
}

export type SlideGenerationQueueResult =
  | { readonly kind: "blocked"; readonly issues: readonly string[] }
  | {
      readonly kind: "ready";
      readonly status: "succeeded" | "partial_failure" | "failed";
      readonly context: SlideGenerationQueueContext;
      readonly slides: readonly GeneratedSlide[];
      readonly failures: readonly SlideGenerationFailure[];
      readonly jobs: readonly ProviderJob[];
      readonly promptUsages: readonly PromptUsageRecord[];
      readonly progress: SlideGenerationQueueProgress;
    };

export interface RunSlideGenerationQueueInput {
  readonly bundles: readonly SlideContextBundle[];
  readonly manager?: ProviderJobManager;
  readonly maxParallel?: number;
  readonly providerId?: string;
  readonly generateSlide: (input: SlideGenerationWorkerInput) => Promise<GeneratedSlide>;
  readonly onProgress?: (progress: SlideGenerationQueueProgress) => void;
}
