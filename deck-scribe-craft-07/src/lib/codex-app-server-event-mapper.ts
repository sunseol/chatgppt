import type { CodexAppServerTaskEvent } from "./codex-app-server-event-runner";

export type CodexAppServerJsonRpcNotification = {
  readonly method: string;
  readonly params?: unknown;
};

export type CollectCodexAppServerTaskEventsInput = {
  readonly notifications: readonly CodexAppServerJsonRpcNotification[];
  readonly runtime: string;
  readonly promptVersion: string;
  readonly durationMs: number;
  readonly inputArtifactIds: readonly string[];
};

export type CodexAppServerTaskEventCollection = {
  readonly events: readonly CodexAppServerTaskEvent[];
  readonly issues: readonly string[];
};

type MappingState = {
  readonly threadId?: string;
  readonly turnId?: string;
  readonly outputText: string;
  readonly finalText?: string;
  readonly failed?: boolean;
};

type MappingResult = {
  readonly state: MappingState;
  readonly events: readonly CodexAppServerTaskEvent[];
  readonly issues: readonly string[];
};

export function collectCodexAppServerTaskEvents(
  input: CollectCodexAppServerTaskEventsInput,
): CodexAppServerTaskEventCollection {
  let state: MappingState = { outputText: "" };
  const events: CodexAppServerTaskEvent[] = [];
  const issues: string[] = [];

  for (const notification of input.notifications) {
    const mapped = mapNotification(input, state, notification);
    state = mapped.state;
    events.push(...mapped.events);
    issues.push(...mapped.issues);
  }

  return { events, issues };
}

function mapNotification(
  input: CollectCodexAppServerTaskEventsInput,
  state: MappingState,
  notification: CodexAppServerJsonRpcNotification,
): MappingResult {
  switch (notification.method) {
    case "turn/started":
      return mapTurnStarted(state, notification);
    case "item/agentMessage/delta":
      return mapAgentMessageDelta(state, notification);
    case "item/completed":
      return mapItemCompleted(state, notification);
    case "turn/completed":
      return mapTurnCompleted(input, state, notification);
    case "error":
      return mapError(state, notification);
    default:
      return { state, events: [], issues: [] };
  }
}

function mapTurnStarted(
  state: MappingState,
  notification: CodexAppServerJsonRpcNotification,
): MappingResult {
  const params = paramsRecord(notification);
  if (!params) return invalid(state, "turn/started params must be an object.");
  const threadId = getString(params, "threadId") ?? state.threadId;
  const turnId =
    getString(params, "turnId") ?? getNestedString(params, "turn", "id") ?? state.turnId;
  if (!threadId || !turnId) return invalid(state, "turn/started requires threadId and turn id.");
  return {
    state: { ...state, threadId, turnId },
    events: [{ kind: "turn_started", threadId, turnId }],
    issues: [],
  };
}

function mapAgentMessageDelta(
  state: MappingState,
  notification: CodexAppServerJsonRpcNotification,
): MappingResult {
  const params = paramsRecord(notification);
  if (!params) return invalid(state, "item/agentMessage/delta params must be an object.");
  const threadId = getString(params, "threadId") ?? state.threadId;
  const turnId = getString(params, "turnId") ?? state.turnId;
  const delta = getString(params, "delta");
  if (!threadId || !turnId || delta === undefined) {
    return invalid(state, "item/agentMessage/delta requires threadId, turnId, and delta.");
  }

  const text = `${state.outputText}${delta}`;
  return {
    state: { ...state, threadId, turnId, outputText: text },
    events: [{ kind: "partial", threadId, turnId, text }],
    issues: [],
  };
}

function mapItemCompleted(
  state: MappingState,
  notification: CodexAppServerJsonRpcNotification,
): MappingResult {
  const params = paramsRecord(notification);
  if (!params) return invalid(state, "item/completed params must be an object.");
  const item = getRecord(params, "item");
  if (!item || getString(item, "type") !== "agentMessage") {
    return { state, events: [], issues: [] };
  }

  const text = getString(item, "text");
  if (text === undefined) return invalid(state, "completed agentMessage requires text.");
  return { state: { ...state, finalText: text, outputText: text }, events: [], issues: [] };
}

function mapTurnCompleted(
  input: CollectCodexAppServerTaskEventsInput,
  state: MappingState,
  notification: CodexAppServerJsonRpcNotification,
): MappingResult {
  const params = paramsRecord(notification);
  if (!params) return invalid(state, "turn/completed params must be an object.");
  const threadId = getString(params, "threadId") ?? state.threadId;
  const turnId =
    getString(params, "turnId") ?? getNestedString(params, "turn", "id") ?? state.turnId;
  if (!threadId || !turnId) return invalid(state, "turn/completed requires threadId and turn id.");

  const turn = getRecord(params, "turn");
  if (turn && getString(turn, "status") === "failed") {
    if (state.failed) {
      return { state: { ...state, threadId, turnId, failed: true }, events: [], issues: [] };
    }
    return {
      state: { ...state, threadId, turnId, failed: true },
      events: [
        {
          kind: "failed",
          threadId,
          turnId,
          message: getNestedString(turn, "error", "message") ?? "Codex App Server turn failed.",
        },
      ],
      issues: [],
    };
  }

  const parsed = parseJsonPayload(state.finalText ?? state.outputText);
  if (parsed.kind === "invalid") return invalid({ ...state, threadId, turnId }, parsed.issue);

  return {
    state: { ...state, threadId, turnId },
    events: [
      {
        kind: "completed",
        threadId,
        turnId,
        payload: parsed.payload,
        runtime: input.runtime,
        promptVersion: input.promptVersion,
        durationMs: input.durationMs,
        inputArtifactIds: input.inputArtifactIds,
      },
    ],
    issues: [],
  };
}

function mapError(
  state: MappingState,
  notification: CodexAppServerJsonRpcNotification,
): MappingResult {
  const params = paramsRecord(notification);
  const threadId = params ? (getString(params, "threadId") ?? state.threadId) : state.threadId;
  const turnId = params ? (getString(params, "turnId") ?? state.turnId) : state.turnId;
  const message = params
    ? (getString(params, "message") ?? getNestedString(params, "error", "message"))
    : undefined;
  if (!threadId || !turnId || !message) {
    return invalid(state, "error notification requires active threadId, turnId, and message.");
  }
  return {
    state: { ...state, threadId, turnId, failed: true },
    events: [{ kind: "failed", threadId, turnId, message }],
    issues: [],
  };
}

function parseJsonPayload(
  text: string,
):
  | { readonly kind: "valid"; readonly payload: unknown }
  | { readonly kind: "invalid"; readonly issue: string } {
  if (text.length === 0) return { kind: "invalid", issue: "completed turn has no agent output." };
  try {
    const payload: unknown = JSON.parse(text);
    return { kind: "valid", payload };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: "invalid", issue: `completed agent output is not JSON: ${error.message}` };
    }
    if (error instanceof Error) {
      return { kind: "invalid", issue: `completed agent output parse failed: ${error.message}` };
    }
    return { kind: "invalid", issue: "completed agent output parse failed." };
  }
}

function invalid(state: MappingState, issue: string): MappingResult {
  return { state, events: [], issues: [issue] };
}

function paramsRecord(
  notification: CodexAppServerJsonRpcNotification,
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
