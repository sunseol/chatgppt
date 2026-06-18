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
  readonly eventMethods: readonly string[];
  readonly notifications: readonly CodexAppServerJsonRpcNotification[];
};

export type DesktopCodexAppServerStructuredTurnRequest = {
  readonly prompt: string;
  readonly outputSchema: unknown;
  readonly model?: string;
  readonly networkAccess?: boolean;
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
  }
}

export function getDesktopAppServerBridgeStatus(
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
): ProductionTextWorkflowBridgeStatus {
  return runtime?.core?.invoke ? "available" : "missing";
}

export async function runDesktopCodexAppServerSmoke(
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
): Promise<DesktopCodexAppServerSmokeResult> {
  const invoke = runtime?.core?.invoke;
  if (!invoke) return { kind: "missing_bridge" };

  try {
    const value = await invoke("deckforge_codex_app_server_smoke");
    return {
      kind: "completed",
      evidence: CodexAppServerSmokeEvidenceSchema.parse(value),
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

export async function runDesktopCodexAppServerStructuredTurn(
  request: DesktopCodexAppServerStructuredTurnRequest,
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
): Promise<DesktopCodexAppServerStructuredTurnResult> {
  const invoke = runtime?.core?.invoke;
  if (!invoke) return { kind: "missing_bridge" };

  try {
    const value = await invoke("deckforge_codex_app_server_structured_turn", { request });
    return {
      kind: "completed",
      evidence: parseStructuredTurnEvidence(value),
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
    eventMethods: parsed.eventMethods,
    notifications: parsed.notifications,
  };
}

function getTauriRuntime(): DeckforgeTauriRuntime | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__TAURI__;
}
