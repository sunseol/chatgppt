import type { SlideGenerationQueueConcurrencyEvidence } from "./slide-generation-queue-types";

export function createSlideGenerationQueueConcurrencyTracker(input: {
  readonly requestedMaxParallel: number;
  readonly effectiveMaxParallel: number;
}) {
  let running = 0;
  let observedMaxRunning = 0;

  return {
    start() {
      running += 1;
      observedMaxRunning = Math.max(observedMaxRunning, running);
    },
    finish() {
      running = Math.max(0, running - 1);
    },
    evidence(): SlideGenerationQueueConcurrencyEvidence {
      return {
        requestedMaxParallel: input.requestedMaxParallel,
        effectiveMaxParallel: input.effectiveMaxParallel,
        observedMaxRunning,
      };
    },
  };
}
