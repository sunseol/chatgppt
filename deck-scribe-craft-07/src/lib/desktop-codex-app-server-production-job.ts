import {
  runProductionCodexAppServerJob,
  type ProductionCodexAppServerJobInput,
} from "./codex-app-server-production-job";
import {
  runDesktopCodexAppServerStructuredTurn,
  type DeckforgeTauriRuntime,
  type DesktopCodexAppServerStructuredTurnRequest,
} from "./desktop-app-server-bridge";
import type { CodexAppServerJsonRpcNotification } from "./codex-app-server-event-mapper";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";
import type { ProviderJob } from "./provider-job-manager";

export type DesktopProductionCodexAppServerJobInput<TValue> = Omit<
  ProductionCodexAppServerJobInput<TValue>,
  "durationMs" | "notifications" | "runtime"
> & {
  readonly tauriRuntime?: DeckforgeTauriRuntime;
  readonly turnRequest: DesktopCodexAppServerStructuredTurnRequest;
};

export class DesktopCodexAppServerBridgeError extends Error {
  readonly name = "DesktopCodexAppServerBridgeError";

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function runDesktopProductionCodexAppServerJob<TValue>(
  input: DesktopProductionCodexAppServerJobInput<TValue>,
): Promise<ProviderJob<StructuredCodexAccepted<TValue>>> {
  const { tauriRuntime, turnRequest, ...jobInput } = input;
  const turnResult = await runDesktopCodexAppServerStructuredTurn(turnRequest, tauriRuntime);

  if (turnResult.kind === "missing_bridge") {
    throw new DesktopCodexAppServerBridgeError(
      "missing_bridge",
      "Desktop Tauri bridge is not available.",
    );
  }
  if (turnResult.kind === "failed") {
    throw new DesktopCodexAppServerBridgeError(turnResult.error.code, turnResult.error.message);
  }

  return runProductionCodexAppServerJob({
    ...jobInput,
    runtime: turnResult.evidence.runtime,
    durationMs: turnResult.evidence.durationMs,
    notifications: notificationStream(turnResult.evidence.notifications),
  });
}

async function* notificationStream(
  notifications: readonly CodexAppServerJsonRpcNotification[],
): AsyncIterable<CodexAppServerJsonRpcNotification> {
  for (const notification of notifications) yield notification;
}
