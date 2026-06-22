import { z } from "zod";
import type { CodexAppServerJsonRpcNotification } from "./codex-app-server-event-mapper";
import type { ProductionTextWorkflowBridgeStatus } from "./production-text-workflow-gate";

const CodexAppServerJsonRpcNotificationSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
});

const CodexAppServerSmokeEvidenceSchema = z.object({
  initOk: z.boolean(),
  accountType: z.string().nullable().optional(),
  threadId: z.string(),
  turnId: z.string(),
  turnCompleted: z.boolean(),
  protocolLineCount: z.number().int().nonnegative(),
  stderrLogLineCount: z.number().int().nonnegative(),
  eventMethods: z.array(z.string()),
  finalText: z.string(),
});

const CodexAppServerSmokeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

const CodexAppServerStructuredTurnEvidenceSchema = z.object({
  runtime: z.string(),
  threadId: z.string(),
  turnId: z.string(),
  turnCompleted: z.boolean(),
  durationMs: z.number().int().nonnegative(),
  protocolLineCount: z.number().int().nonnegative(),
  stderrLogLineCount: z.number().int().nonnegative(),
  eventMethods: z.array(z.string()),
  notifications: z.array(CodexAppServerJsonRpcNotificationSchema),
});

export type CodexAppServerSmokeEvidence = Readonly<
  z.infer<typeof CodexAppServerSmokeEvidenceSchema>
>;

export type CodexAppServerSmokeError = Readonly<z.infer<typeof CodexAppServerSmokeErrorSchema>>;

export type CodexAppServerStructuredTurnEvidence = {
  readonly runtime: string;
  readonly threadId: string;
  readonly turnId: string;
  readonly turnCompleted: boolean;
  readonly durationMs: number;
  readonly protocolLineCount: number;
  readonly stderrLogLineCount: number;
  readonly eventMethods: readonly string[];
  readonly notifications: readonly CodexAppServerJsonRpcNotification[];
};

export type DesktopCodexAppServerStructuredTurnRequest = {
  readonly prompt: string;
  readonly outputSchema: unknown;
  readonly model?: string;
  readonly networkAccess?: boolean;
  readonly turnTimeoutMs?: number;
};

export type DeckforgeTauriInvoke = (
  command: string,
  args?: Readonly<Record<string, unknown>>,
) => Promise<unknown>;

export type DeckforgeTauriRuntime = {
  readonly core?: {
    readonly invoke?: DeckforgeTauriInvoke;
  };
};

export type DeckforgeDryRunCodexBridge = {
  readonly enabled: boolean;
  readonly smokeEndpoint: string;
  readonly structuredTurnEndpoint: string;
};

export type DesktopCodexAppServerSmokeResult =
  | { readonly kind: "missing_bridge" }
  | { readonly kind: "completed"; readonly evidence: CodexAppServerSmokeEvidence }
  | { readonly kind: "failed"; readonly error: CodexAppServerSmokeError };

export type DesktopCodexAppServerStructuredTurnResult =
  | { readonly kind: "missing_bridge" }
  | { readonly kind: "completed"; readonly evidence: CodexAppServerStructuredTurnEvidence }
  | { readonly kind: "failed"; readonly error: CodexAppServerSmokeError };

declare global {
  interface Window {
    readonly __TAURI__?: DeckforgeTauriRuntime;
    readonly __DECKFORGE_DRY_RUN_CODEX_BRIDGE__?: DeckforgeDryRunCodexBridge;
  }
}

export function getDesktopAppServerBridgeStatus(
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
  dryRunBridge: DeckforgeDryRunCodexBridge | undefined = getDryRunCodexBridge(),
): ProductionTextWorkflowBridgeStatus {
  if (runtime?.core?.invoke) return "available";
  return isDryRunCodexBridgeAvailable(dryRunBridge) ? "available" : "missing";
}

export async function runDesktopCodexAppServerSmoke(
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
  dryRunBridge: DeckforgeDryRunCodexBridge | undefined = getDryRunCodexBridge(),
): Promise<DesktopCodexAppServerSmokeResult> {
  try {
    const invoked = await invokeCodexAppServerBridge(
      "deckforge_codex_app_server_smoke",
      undefined,
      runtime,
      dryRunBridge,
    );
    if (invoked.kind === "missing_bridge") return invoked;
    const value = invoked.value;
    const evidence = CodexAppServerSmokeEvidenceSchema.parse(value);
    const issue = smokeEvidenceIssue(evidence);
    if (issue) {
      return {
        kind: "failed",
        error: {
          code: "invalid_smoke_evidence",
          message: issue,
        },
      };
    }
    return {
      kind: "completed",
      evidence,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        kind: "failed",
        error: {
          code: "invalid_smoke_evidence",
          message: error.message,
        },
      };
    }
    const parsed = CodexAppServerSmokeErrorSchema.safeParse(error);
    if (parsed.success) return { kind: "failed", error: parsed.data };
    if (error instanceof Error) {
      return { kind: "failed", error: { code: "invoke_failed", message: error.message } };
    }
    throw error;
  }
}

function smokeEvidenceIssue(evidence: CodexAppServerSmokeEvidence): string | null {
  if (!evidence.initOk) return "App Server smoke did not complete initialize.";
  if (!evidence.accountType) return "App Server smoke did not report an authenticated account.";
  if (!evidence.threadId.trim()) return "App Server smoke did not report a health thread id.";
  if (!evidence.turnId.trim()) return "App Server smoke did not report a health turn id.";
  if (!evidence.turnCompleted) return "App Server smoke health turn did not complete.";
  if (evidence.protocolLineCount <= 0) {
    return "App Server smoke did not capture stdout protocol frames.";
  }
  if (!evidence.eventMethods.includes("turn/completed")) {
    return "App Server smoke did not observe a completed turn protocol event.";
  }
  return null;
}

export async function runDesktopCodexAppServerStructuredTurn(
  request: DesktopCodexAppServerStructuredTurnRequest,
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
  dryRunBridge: DeckforgeDryRunCodexBridge | undefined = getDryRunCodexBridge(),
): Promise<DesktopCodexAppServerStructuredTurnResult> {
  try {
    const invoked = await invokeCodexAppServerBridge(
      "deckforge_codex_app_server_structured_turn",
      { request },
      runtime,
      dryRunBridge,
    );
    if (invoked.kind === "missing_bridge") return invoked;
    const value = invoked.value;
    const evidence = parseStructuredTurnEvidence(value);
    const issue = structuredTurnEvidenceIssue(evidence);
    if (issue) {
      return {
        kind: "failed",
        error: {
          code: "invalid_structured_turn_evidence",
          message: issue,
        },
      };
    }
    return {
      kind: "completed",
      evidence,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        kind: "failed",
        error: {
          code: "invalid_structured_turn_evidence",
          message: error.message,
        },
      };
    }
    const parsed = CodexAppServerSmokeErrorSchema.safeParse(error);
    if (parsed.success) return { kind: "failed", error: parsed.data };
    if (error instanceof Error) {
      return { kind: "failed", error: { code: "invoke_failed", message: error.message } };
    }
    throw error;
  }
}

function parseStructuredTurnEvidence(value: unknown): CodexAppServerStructuredTurnEvidence {
  const parsed = CodexAppServerStructuredTurnEvidenceSchema.parse(value);
  return {
    runtime: parsed.runtime,
    threadId: parsed.threadId,
    turnId: parsed.turnId,
    turnCompleted: parsed.turnCompleted,
    durationMs: parsed.durationMs,
    protocolLineCount: parsed.protocolLineCount,
    stderrLogLineCount: parsed.stderrLogLineCount,
    eventMethods: parsed.eventMethods,
    notifications: parsed.notifications,
  };
}

function structuredTurnEvidenceIssue(
  evidence: CodexAppServerStructuredTurnEvidence,
): string | null {
  if (!evidence.runtime.trim()) return "App Server structured turn did not report a runtime.";
  if (!evidence.threadId.trim()) return "App Server structured turn did not report a thread id.";
  if (!evidence.turnId.trim()) return "App Server structured turn did not report a turn id.";
  if (!evidence.turnCompleted) return "App Server structured turn did not complete.";
  if (evidence.protocolLineCount <= 0) {
    return "App Server structured turn did not capture stdout protocol frames.";
  }
  if (!evidence.eventMethods.includes("turn/completed")) {
    return "App Server structured turn did not observe a completed turn protocol event.";
  }
  if (!evidence.notifications.some((notification) => notification.method === "turn/completed")) {
    return "App Server structured turn did not preserve a completed turn notification.";
  }
  return null;
}

function getTauriRuntime(): DeckforgeTauriRuntime | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__TAURI__;
}

function getDryRunCodexBridge(): DeckforgeDryRunCodexBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__DECKFORGE_DRY_RUN_CODEX_BRIDGE__;
}

function isDryRunCodexBridgeAvailable(
  bridge: DeckforgeDryRunCodexBridge | undefined,
): bridge is DeckforgeDryRunCodexBridge {
  return (
    bridge?.enabled === true &&
    bridge.smokeEndpoint.trim().length > 0 &&
    bridge.structuredTurnEndpoint.trim().length > 0
  );
}

async function invokeCodexAppServerBridge(
  command: "deckforge_codex_app_server_smoke" | "deckforge_codex_app_server_structured_turn",
  args: Readonly<Record<string, unknown>> | undefined,
  runtime: DeckforgeTauriRuntime | undefined,
  dryRunBridge: DeckforgeDryRunCodexBridge | undefined,
): Promise<
  { readonly kind: "missing_bridge" } | { readonly kind: "completed"; readonly value: unknown }
> {
  const invoke = runtime?.core?.invoke;
  if (invoke) return { kind: "completed", value: await invoke(command, args) };

  if (!isDryRunCodexBridgeAvailable(dryRunBridge)) return { kind: "missing_bridge" };
  const endpoint =
    command === "deckforge_codex_app_server_smoke"
      ? dryRunBridge.smokeEndpoint
      : dryRunBridge.structuredTurnEndpoint;
  return { kind: "completed", value: await invokeDryRunCodexBridge(endpoint, args) };
}

async function invokeDryRunCodexBridge(
  endpoint: string,
  args: Readonly<Record<string, unknown>> | undefined,
): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args ?? {}),
  });
  const value = await parseDryRunBridgeResponse(response);
  if (response.ok) return value;

  const parsed = CodexAppServerSmokeErrorSchema.safeParse(value);
  if (parsed.success) throw parsed.data;
  throw new Error(`Dry-run Codex bridge request failed with status ${response.status}.`);
}

async function parseDryRunBridgeResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Dry-run Codex bridge returned non-JSON response.");
    }
    throw error;
  }
}
