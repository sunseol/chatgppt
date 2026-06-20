import { AppServerJsonRpcSession } from "./live-app-server-session.ts";
import {
  AppServerJsonRpcError,
  firstStringAt,
  isRecord,
  type JsonObject,
  type JsonRpcNotification,
  type SmokeEvidence,
  type StructuredTurnEvidence,
  type StructuredTurnRequest,
} from "./live-app-server-types.ts";

const REQUEST_TIMEOUT_MS = 60_000;
const TURN_TIMEOUT_MS = 300_000;
const DEFAULT_MODEL = "gpt-5.4";

export async function runStructuredTurn(
  request: StructuredTurnRequest,
): Promise<StructuredTurnEvidence> {
  validateStructuredTurnRequest(request);
  const startedAt = Date.now();
  const session = AppServerJsonRpcSession.spawn();
  try {
    await initializeSession(session, "deckforge-live-app-surface");
    const threadId = await startThread(session, request);
    const turnId = await startTurn(session, threadId, request);
    await session.waitForMethod("turn/completed", TURN_TIMEOUT_MS);
    const notifications = session.notifications();
    return {
      runtime: "codex app-server --stdio",
      threadId,
      turnId,
      turnCompleted: true,
      durationMs: Date.now() - startedAt,
      protocolLineCount: session.protocolLineCount,
      stderrLogLineCount: session.stderrLogLineCount,
      eventMethods: collectEventMethods(notifications),
      notifications,
    };
  } finally {
    await session.close();
  }
}

export async function runSmoke(): Promise<SmokeEvidence> {
  const session = AppServerJsonRpcSession.spawn();
  try {
    const initialize = await initializeSession(session, "deckforge-live-smoke");
    const account = await session.request("account/read", {}, REQUEST_TIMEOUT_MS);
    const threadId = await startThread(session, {});
    const turnId = await startTurn(session, threadId, {
      prompt:
        'Return only JSON matching the schema. Use artifact "deckforge_live_current_smoke", stage "current_health", mock false, fixture false, status "ok".',
      outputSchema: smokeOutputSchema(),
      networkAccess: false,
    });
    await session.waitForMethod("turn/completed", TURN_TIMEOUT_MS);
    const notifications = session.notifications();
    return {
      initOk: isRecord(initialize["result"]),
      accountType: firstStringAt(account, [
        ["result", "account", "type"],
        ["result", "type"],
      ]),
      threadId,
      turnId,
      turnCompleted: true,
      protocolLineCount: session.protocolLineCount,
      stderrLogLineCount: session.stderrLogLineCount,
      eventMethods: collectEventMethods(notifications),
      finalText: finalAgentText(notifications),
    };
  } finally {
    await session.close();
  }
}

async function initializeSession(
  session: AppServerJsonRpcSession,
  name: string,
): Promise<JsonObject> {
  return session.request(
    "initialize",
    {
      clientInfo: { name, version: "0.1.0" },
      capabilities: { experimentalApi: true },
    },
    REQUEST_TIMEOUT_MS,
  );
}

async function startThread(
  session: AppServerJsonRpcSession,
  request: Pick<StructuredTurnRequest, "model">,
): Promise<string> {
  const response = await session.request(
    "thread/start",
    {
      cwd: process.cwd(),
      approvalPolicy: "never",
      sandbox: "read-only",
      model: modelName(request),
    },
    REQUEST_TIMEOUT_MS,
  );
  const threadId = firstStringAt(response, [
    ["result", "thread", "id"],
    ["result", "threadId"],
    ["result", "id"],
  ]);
  if (threadId === undefined) {
    throw new AppServerJsonRpcError("missing_thread_id", "thread/start returned no id.");
  }
  return threadId;
}

async function startTurn(
  session: AppServerJsonRpcSession,
  threadId: string,
  request: StructuredTurnRequest,
): Promise<string> {
  const response = await session.request(
    "turn/start",
    {
      threadId,
      input: [{ type: "text", text: request.prompt }],
      outputSchema: request.outputSchema,
      approvalPolicy: "never",
      sandboxPolicy: {
        type: "readOnly",
        networkAccess: request.networkAccess === true,
      },
    },
    REQUEST_TIMEOUT_MS,
  );
  const turnId = firstStringAt(response, [
    ["result", "turn", "id"],
    ["result", "turnId"],
    ["result", "id"],
  ]);
  if (turnId === undefined) {
    throw new AppServerJsonRpcError("missing_turn_id", "turn/start returned no id.");
  }
  return turnId;
}

function validateStructuredTurnRequest(request: StructuredTurnRequest): void {
  if (request.prompt.trim().length === 0) {
    throw new AppServerJsonRpcError("invalid_structured_turn_request", "prompt is required.");
  }
  if (!isRecord(request.outputSchema)) {
    throw new AppServerJsonRpcError(
      "invalid_structured_turn_request",
      "outputSchema must be a JSON object.",
    );
  }
}

function modelName(request: Pick<StructuredTurnRequest, "model">): string {
  const trimmed = request.model?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_MODEL;
}

function collectEventMethods(notifications: readonly JsonRpcNotification[]): readonly string[] {
  const methods: string[] = [];
  for (const notification of notifications) {
    if (!methods.includes(notification.method)) methods.push(notification.method);
  }
  return methods;
}

function finalAgentText(notifications: readonly JsonRpcNotification[]): string {
  for (const notification of [...notifications].reverse()) {
    const params = isRecord(notification.params) ? notification.params : undefined;
    const item = params && isRecord(params["item"]) ? params["item"] : undefined;
    const text = item && typeof item["text"] === "string" ? item["text"] : undefined;
    if (text !== undefined) return text;
  }
  return "";
}

function smokeOutputSchema(): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    required: ["artifact", "stage", "mock", "fixture", "status"],
    properties: {
      artifact: { type: "string" },
      stage: { type: "string" },
      mock: { type: "boolean" },
      fixture: { type: "boolean" },
      status: { type: "string" },
    },
  };
}
