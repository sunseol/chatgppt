import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import {
  AppServerJsonRpcError,
  digestText,
  runSmoke,
  runStructuredTurn,
} from "./live-app-server-json-rpc.ts";

const DEFAULT_PORT = 3987;
const HOST = "127.0.0.1";

const StructuredTurnRequestSchema = z.object({
  prompt: z.string().min(1),
  outputSchema: z.record(z.unknown()),
  model: z.string().optional(),
  networkAccess: z.boolean().optional(),
});

const InvokeRequestSchema = z.object({
  command: z.string(),
  args: z.record(z.unknown()).optional(),
});

const StructuredInvokeArgsSchema = z.object({
  request: StructuredTurnRequestSchema,
});

type InvocationSummary = {
  readonly command: string;
  readonly status: "completed" | "failed";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly requestDigest?: string;
  readonly notificationDigest?: string;
  readonly threadId?: string;
  readonly turnId?: string;
  readonly durationMs?: number;
  readonly eventMethods?: readonly string[];
  readonly protocolLineCount?: number;
  readonly stderrLogLineCount?: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
};

type AppServerSummaryEvidence = {
  readonly threadId: string;
  readonly turnId: string;
  readonly durationMs?: number;
  readonly eventMethods: readonly string[];
  readonly protocolLineCount: number;
  readonly stderrLogLineCount: number;
  readonly notifications?: readonly unknown[];
  readonly finalText?: string;
};

class AppSurfaceHelperError extends Error {
  readonly name = "AppSurfaceHelperError";

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const invocations: InvocationSummary[] = [];
const port = parsePort(process.env.DECKFORGE_LIVE_HELPER_PORT);
const server = createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(port, HOST, () => {
  console.log(`DeckForge live text app-surface helper listening on http://${HOST}:${port}`);
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  writeCorsHeaders(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url ?? "/", `http://${HOST}:${port}`);
    if (request.method === "GET" && url.pathname === "/health") {
      writeJson(response, 200, { status: "ok", invocations: invocations.length });
      return;
    }
    if (request.method === "GET" && url.pathname === "/summary") {
      writeJson(response, 200, { invocations });
      return;
    }
    if (request.method === "POST" && url.pathname === "/invoke") {
      writeJson(response, 200, await handleInvoke(await readJsonBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/shutdown") {
      writeJson(response, 200, { status: "closing" });
      server.close();
      return;
    }
    throw new AppSurfaceHelperError("not_found", `Unsupported helper route: ${url.pathname}`);
  } catch (error) {
    if (error instanceof AppSurfaceHelperError) {
      writeJson(response, 400, { code: error.code, message: error.message });
      return;
    }
    if (error instanceof AppServerJsonRpcError) {
      writeJson(response, 500, { code: error.code, message: error.message });
      return;
    }
    if (error instanceof z.ZodError) {
      writeJson(response, 400, { code: "invalid_request", message: error.message });
      return;
    }
    if (error instanceof Error) {
      writeJson(response, 500, { code: "helper_failed", message: error.message });
      return;
    }
    throw error;
  }
}

async function handleInvoke(value: unknown): Promise<unknown> {
  const parsed = InvokeRequestSchema.parse(value);
  switch (parsed.command) {
    case "deckforge_codex_app_server_smoke":
      return recordInvocation(parsed.command, undefined, () => runSmoke());
    case "deckforge_codex_app_server_structured_turn": {
      const args = StructuredInvokeArgsSchema.parse(parsed.args ?? {});
      return recordInvocation(parsed.command, args.request.prompt, () =>
        runStructuredTurn(args.request),
      );
    }
    default:
      throw new AppSurfaceHelperError(
        "unsupported_command",
        `Unsupported Tauri command: ${parsed.command}`,
      );
  }
}

async function recordInvocation<TValue>(
  command: string,
  prompt: string | undefined,
  run: () => Promise<TValue>,
): Promise<TValue> {
  const startedAt = new Date().toISOString();
  try {
    const result = await run();
    const completedAt = new Date().toISOString();
    invocations.push({
      command,
      status: "completed",
      startedAt,
      completedAt,
      ...(prompt === undefined ? {} : { requestDigest: digestText(prompt) }),
      ...structuredSummary(result),
    });
    return result;
  } catch (error) {
    const completedAt = new Date().toISOString();
    if (error instanceof AppServerJsonRpcError) {
      invocations.push({
        command,
        status: "failed",
        startedAt,
        completedAt,
        ...(prompt === undefined ? {} : { requestDigest: digestText(prompt) }),
        errorCode: error.code,
        errorMessage: error.message,
      });
      throw error;
    }
    if (error instanceof Error) {
      invocations.push({
        command,
        status: "failed",
        startedAt,
        completedAt,
        ...(prompt === undefined ? {} : { requestDigest: digestText(prompt) }),
        errorCode: "unexpected_error",
        errorMessage: error.message,
      });
      throw error;
    }
    throw error;
  }
}

function structuredSummary(value: unknown): Partial<InvocationSummary> {
  if (!isAppServerSummaryEvidence(value)) return {};
  const notificationText =
    value.notifications === undefined ? undefined : JSON.stringify(value.notifications);
  const finalText = value.finalText === undefined ? undefined : value.finalText;
  return {
    notificationDigest:
      notificationText === undefined ? digestText(finalText ?? "") : digestText(notificationText),
    threadId: value.threadId,
    turnId: value.turnId,
    ...(value.durationMs === undefined ? {} : { durationMs: value.durationMs }),
    eventMethods: value.eventMethods,
    protocolLineCount: value.protocolLineCount,
    stderrLogLineCount: value.stderrLogLineCount,
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    if (chunk instanceof Buffer) chunks.push(chunk);
    if (typeof chunk === "string") chunks.push(Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim().length === 0) return {};
  return JSON.parse(text);
}

function writeCorsHeaders(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function parsePort(value: string | undefined): number {
  const parsed = value === undefined ? DEFAULT_PORT : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) return DEFAULT_PORT;
  return parsed;
}

function isAppServerSummaryEvidence(value: unknown): value is AppServerSummaryEvidence {
  if (!isRecord(value)) return false;
  return (
    typeof value["threadId"] === "string" &&
    typeof value["turnId"] === "string" &&
    Array.isArray(value["eventMethods"]) &&
    typeof value["protocolLineCount"] === "number" &&
    typeof value["stderrLogLineCount"] === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
