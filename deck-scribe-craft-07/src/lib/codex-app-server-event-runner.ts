import {
  ProviderJobCancelledError,
  type ProviderJob,
  type ProviderJobManager,
} from "./provider-job-manager";
import type { ProviderCapability } from "./provider-types";
import {
  evaluateStructuredCodexOutput,
  type StructuredCodexAccepted,
  type StructuredCodexParser,
} from "./codex-structured-task-runner";

export type CodexAppServerTaskEvent =
  | {
      readonly kind: "turn_started";
      readonly threadId: string;
      readonly turnId: string;
    }
  | {
      readonly kind: "progress";
      readonly threadId: string;
      readonly turnId: string;
      readonly percent: number;
      readonly message: string;
    }
  | {
      readonly kind: "approval_requested";
      readonly threadId: string;
      readonly turnId: string;
      readonly message: string;
    }
  | {
      readonly kind: "partial";
      readonly threadId: string;
      readonly turnId: string;
      readonly text: string;
    }
  | {
      readonly kind: "completed";
      readonly threadId: string;
      readonly turnId: string;
      readonly payload: unknown;
      readonly runtime: string;
      readonly promptVersion: string;
      readonly durationMs: number;
      readonly inputArtifactIds: readonly string[];
    }
  | {
      readonly kind: "failed";
      readonly threadId: string;
      readonly turnId: string;
      readonly message: string;
    };

export type RunStructuredCodexJobInput<TValue> = {
  readonly jobManager: ProviderJobManager;
  readonly capability: ProviderCapability;
  readonly description: string;
  readonly artifactId: string;
  readonly parse: StructuredCodexParser<TValue>;
  readonly events: AsyncIterable<CodexAppServerTaskEvent>;
};

export class CodexAppServerEventFailedError extends Error {
  constructor(message: string) {
    super(`Codex App Server event failed: ${message}`);
    this.name = "CodexAppServerEventFailedError";
  }
}

export class CodexStructuredOutputRejectedError extends Error {
  constructor(code: string, issues: readonly string[]) {
    super(`Codex structured output rejected: ${code}: ${issues.join("; ")}`);
    this.name = "CodexStructuredOutputRejectedError";
  }
}

export class CodexStructuredCompletionMissingError extends Error {
  constructor() {
    super("Codex App Server stream ended before a completed structured output event.");
    this.name = "CodexStructuredCompletionMissingError";
  }
}

export async function runStructuredCodexJob<TValue>(
  input: RunStructuredCodexJobInput<TValue>,
): Promise<ProviderJob<StructuredCodexAccepted<TValue>>> {
  const queued = input.jobManager.enqueue({
    providerId: "codex",
    capability: input.capability,
    description: input.description,
  });

  return input.jobManager.run(queued.id, async (job) => {
    for await (const event of input.events) {
      if (job.isCancellationRequested()) throw new ProviderJobCancelledError(queued.id);

      switch (event.kind) {
        case "turn_started":
          job.reportProgress({ percent: 5, message: `Codex turn started: ${event.turnId}` });
          break;
        case "progress":
          job.reportProgress({ percent: event.percent, message: event.message });
          break;
        case "approval_requested":
          job.reportProgress({ percent: 90, message: `Approval requested: ${event.message}` });
          break;
        case "partial":
          job.recordPartialResult({
            kind: "codex_partial",
            text: event.text,
            threadId: event.threadId,
            turnId: event.turnId,
          });
          break;
        case "completed":
          return acceptedOutput(input, event);
        case "failed":
          throw new CodexAppServerEventFailedError(event.message);
        default:
          assertNever(event);
      }
    }

    throw new CodexStructuredCompletionMissingError();
  });
}

function acceptedOutput<TValue>(
  input: RunStructuredCodexJobInput<TValue>,
  event: Extract<CodexAppServerTaskEvent, { readonly kind: "completed" }>,
): StructuredCodexAccepted<TValue> {
  const evaluated = evaluateStructuredCodexOutput({
    artifactId: input.artifactId,
    parse: input.parse,
    event,
  });
  if (evaluated.kind === "accepted") return evaluated;
  throw new CodexStructuredOutputRejectedError(evaluated.code, evaluated.issues);
}

function assertNever(value: never): never {
  throw new CodexAppServerEventFailedError(`Unhandled event: ${JSON.stringify(value)}`);
}
