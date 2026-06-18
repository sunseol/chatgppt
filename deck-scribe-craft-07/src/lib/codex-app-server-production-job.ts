import {
  collectCodexAppServerTaskEvents,
  type CodexAppServerJsonRpcNotification,
} from "./codex-app-server-event-mapper";
import {
  runStructuredCodexJob,
  type RunStructuredCodexJobInput,
} from "./codex-app-server-event-runner";
import type { ProviderJob } from "./provider-job-manager";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";

export type ProductionCodexAppServerJobInput<TValue> = Omit<
  RunStructuredCodexJobInput<TValue>,
  "events"
> & {
  readonly notifications: AsyncIterable<CodexAppServerJsonRpcNotification>;
  readonly runtime: string;
  readonly promptVersion: string;
  readonly durationMs: number;
  readonly inputArtifactIds: readonly string[];
};

export class CodexAppServerEventMappingError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Codex App Server event mapping failed: ${issues.join("; ")}`);
    this.name = "CodexAppServerEventMappingError";
  }
}

export async function runProductionCodexAppServerJob<TValue>(
  input: ProductionCodexAppServerJobInput<TValue>,
): Promise<ProviderJob<StructuredCodexAccepted<TValue>>> {
  const notifications = await collectNotifications(input.notifications);
  const mapped = collectCodexAppServerTaskEvents({
    notifications,
    runtime: input.runtime,
    promptVersion: input.promptVersion,
    durationMs: input.durationMs,
    inputArtifactIds: input.inputArtifactIds,
  });
  if (mapped.issues.length > 0) throw new CodexAppServerEventMappingError(mapped.issues);

  return runStructuredCodexJob({
    jobManager: input.jobManager,
    capability: input.capability,
    description: input.description,
    artifactId: input.artifactId,
    parse: input.parse,
    events: eventStream(mapped.events),
  });
}

async function collectNotifications(
  notifications: AsyncIterable<CodexAppServerJsonRpcNotification>,
): Promise<readonly CodexAppServerJsonRpcNotification[]> {
  const collected: CodexAppServerJsonRpcNotification[] = [];
  for await (const notification of notifications) collected.push(notification);
  return collected;
}

async function* eventStream<TEvent>(events: readonly TEvent[]): AsyncIterable<TEvent> {
  for (const event of events) yield event;
}
