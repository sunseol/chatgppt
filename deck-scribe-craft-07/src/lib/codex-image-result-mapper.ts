import { TARGET_IMAGE_MODEL } from "./image-provider-feasibility";
import type { CodexImageClientResponse } from "./codex-image-provider";

export type CodexImageGenerationNotification = {
  readonly method: string;
  readonly params?: unknown;
};

export type CodexImageGenerationResult =
  | { readonly kind: "ready"; readonly response: CodexImageClientResponse }
  | { readonly kind: "blocked"; readonly issues: readonly string[] };

export function collectCodexImageGenerationResult(input: {
  readonly notifications: readonly CodexImageGenerationNotification[];
  readonly runtime: string;
  readonly durationMs: number;
}): CodexImageGenerationResult {
  let state: CodexImageGenerationState = {};
  const issues: string[] = [];

  for (const notification of input.notifications) {
    const mapped = mapNotification(input, state, notification);
    state = mapped.state;
    issues.push(...mapped.issues);
  }

  if (issues.length > 0) return { kind: "blocked", issues };
  if (state.response === undefined) {
    return { kind: "blocked", issues: ["Codex image generation did not produce an image."] };
  }
  return { kind: "ready", response: state.response };
}

type CodexImageGenerationState = {
  readonly threadId?: string;
  readonly turnId?: string;
  readonly response?: CodexImageClientResponse;
};

type MappingResult = {
  readonly state: CodexImageGenerationState;
  readonly issues: readonly string[];
};

function mapNotification(
  input: {
    readonly runtime: string;
    readonly durationMs: number;
  },
  state: CodexImageGenerationState,
  notification: CodexImageGenerationNotification,
): MappingResult {
  switch (notification.method) {
    case "turn/started":
      return mapTurnStarted(state, notification);
    case "rawResponseItem/completed":
      return mapRawResponseItemCompleted(input, state, notification);
    default:
      return { state, issues: [] };
  }
}

function mapTurnStarted(
  state: CodexImageGenerationState,
  notification: CodexImageGenerationNotification,
): MappingResult {
  const params = paramsRecord(notification);
  if (!params) return { state, issues: ["turn/started params must be an object."] };
  const threadId = getString(params, "threadId") ?? state.threadId;
  const turnId =
    getString(params, "turnId") ?? getNestedString(params, "turn", "id") ?? state.turnId;
  if (!threadId || !turnId) {
    return { state, issues: ["turn/started requires threadId and turn id."] };
  }
  return { state: { ...state, threadId, turnId }, issues: [] };
}

function mapRawResponseItemCompleted(
  input: {
    readonly runtime: string;
    readonly durationMs: number;
  },
  state: CodexImageGenerationState,
  notification: CodexImageGenerationNotification,
): MappingResult {
  const params = paramsRecord(notification);
  if (!params) return { state, issues: ["rawResponseItem/completed params must be an object."] };
  const item = getRecord(params, "item");
  if (!item || getString(item, "type") !== "image_generation_call") {
    return { state, issues: [] };
  }

  const threadId = getString(params, "threadId") ?? state.threadId;
  const turnId = getString(params, "turnId") ?? state.turnId;
  const status = getString(item, "status");
  const result = getString(item, "result");
  if (!threadId || !turnId) {
    return { state, issues: ["image_generation_call requires threadId and turnId."] };
  }
  if (!isCompletedStatus(status)) {
    return { state, issues: [`image_generation_call did not complete: ${status ?? "unknown"}.`] };
  }
  const imageDataUrl = imageDataUrlFromResult(result);
  if (imageDataUrl === undefined) {
    return { state, issues: ["image_generation_call result is empty."] };
  }
  const revisedPrompt = getString(item, "revised_prompt");
  return {
    state: {
      ...state,
      threadId,
      turnId,
      response: {
        imageDataUrl,
        model: TARGET_IMAGE_MODEL,
        runtime: input.runtime,
        threadId,
        turnId,
        latencyMs: input.durationMs,
        usage: { imageCount: 1 },
        ...(revisedPrompt === undefined ? {} : { revisedPrompt }),
      },
    },
    issues: [],
  };
}

function isCompletedStatus(status: string | undefined): boolean {
  return status === "completed" || status === "succeeded";
}

function imageDataUrlFromResult(result: string | undefined): string | undefined {
  const trimmed = result?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:image/png;base64,")) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}

function paramsRecord(
  notification: CodexImageGenerationNotification,
): Record<string, unknown> | undefined {
  return isRecord(notification.params) ? notification.params : undefined;
}

function getNestedString(
  record: Record<string, unknown>,
  key: string,
  nestedKey: string,
): string | undefined {
  const nested = getRecord(record, key);
  return nested ? getString(nested, nestedKey) : undefined;
}

function getRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

function getString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
