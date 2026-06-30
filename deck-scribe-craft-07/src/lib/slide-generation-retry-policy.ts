import {
  classifyImageProviderFailure,
  type ImageProviderFailureKind,
} from "./image-provider-errors";

export interface SlideGenerationRetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export interface SlideGenerationRetryDecision {
  readonly failureKind: ImageProviderFailureKind;
  readonly message: string;
  readonly retryable: boolean;
  readonly shouldRetry: boolean;
  readonly delayMs: number;
}

export interface SlideGenerationRetryEvent {
  readonly jobId: string;
  readonly bundleId: string;
  readonly slideNumber: number;
  readonly attempt: number;
  readonly delayMs: number;
  readonly failureKind: ImageProviderFailureKind;
  readonly message: string;
}

const DEFAULT_RETRY_POLICY: SlideGenerationRetryPolicy = {
  maxAttempts: 1,
  baseDelayMs: 1_000,
  maxDelayMs: 8_000,
};

export function decideSlideGenerationRetry(
  error: unknown,
  attempt: number,
  policy: SlideGenerationRetryPolicy = DEFAULT_RETRY_POLICY,
): SlideGenerationRetryDecision {
  const classification = classifyImageProviderFailure(error);
  const normalized = normalizeRetryPolicy(policy);
  const delayMs = nextRetryDelayMs(attempt, normalized);
  return {
    failureKind: classification.kind,
    message: classification.message,
    retryable: classification.retryable,
    shouldRetry: classification.retryable && attempt < normalized.maxAttempts,
    delayMs,
  };
}

export async function waitForSlideGenerationRetryDelay(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function normalizeRetryPolicy(policy: SlideGenerationRetryPolicy): SlideGenerationRetryPolicy {
  const maxAttempts = Math.max(1, Math.floor(policy.maxAttempts));
  const baseDelayMs = Math.max(0, Math.floor(policy.baseDelayMs));
  const maxDelayMs = Math.max(baseDelayMs, Math.floor(policy.maxDelayMs));
  return { maxAttempts, baseDelayMs, maxDelayMs };
}

function nextRetryDelayMs(attempt: number, policy: SlideGenerationRetryPolicy): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(policy.baseDelayMs * 2 ** exponent, policy.maxDelayMs);
}
