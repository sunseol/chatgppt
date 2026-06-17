import type { ProviderJob, ProviderJobManager, ProviderJobProgress } from "./provider-job-manager";
import type { ProviderCapability, ProviderStatus } from "./provider-types";
import { redactSensitiveText } from "./redaction";

export interface CodexCommandInput {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly prompt: string;
  readonly onProgress: (progress: ProviderJobProgress) => void;
  readonly isCancellationRequested: () => boolean;
}

export interface CodexCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface CodexCommandRunner {
  run(input: CodexCommandInput): Promise<CodexCommandResult>;
}

export interface CodexExecutionAdapterOptions {
  readonly executablePath: string;
  readonly status: ProviderStatus;
  readonly jobManager: ProviderJobManager;
  readonly runner: CodexCommandRunner;
}

export interface CodexExecutionRequest {
  readonly capability: ProviderCapability;
  readonly description: string;
  readonly prompt: string;
  readonly args: readonly string[];
}

export class CodexExecutionUnavailableError extends Error {
  constructor(message: string) {
    super(`Codex is not connected: ${message}`);
    this.name = "CodexExecutionUnavailableError";
  }
}

export class CodexCommandFailedError extends Error {
  readonly exitCode: number;

  constructor(exitCode: number, stderr: string) {
    super(`Codex command failed with exit code ${exitCode}: ${stderr}`);
    this.name = "CodexCommandFailedError";
    this.exitCode = exitCode;
  }
}

export class CodexRunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexRunnerError";
  }
}

export class UnhandledProviderStatusError extends Error {
  constructor() {
    super("Unhandled provider status.");
    this.name = "UnhandledProviderStatusError";
  }
}

export function createCodexExecutionAdapter(options: CodexExecutionAdapterOptions) {
  async function run(request: CodexExecutionRequest): Promise<ProviderJob<CodexCommandResult>> {
    const queued = options.jobManager.enqueue({
      providerId: "codex",
      capability: request.capability,
      description: request.description,
    });

    return options.jobManager.run(queued.id, async (job) => {
      assertCodexConnected(options.status);

      const result = await runCommand(options, request, {
        onProgress: (progress) => {
          job.reportProgress(progress);
        },
        isCancellationRequested: job.isCancellationRequested,
      });

      if (result.exitCode !== 0) {
        throw new CodexCommandFailedError(result.exitCode, result.stderr);
      }

      return result;
    });
  }

  return { run };
}

function assertCodexConnected(status: ProviderStatus): void {
  switch (status.kind) {
    case "connected":
      return;
    case "requiresAuth":
    case "unavailable":
      throw new CodexExecutionUnavailableError(status.message);
    default:
      assertNever(status);
  }
}

async function runCommand(
  options: CodexExecutionAdapterOptions,
  request: CodexExecutionRequest,
  controls: Pick<CodexCommandInput, "onProgress" | "isCancellationRequested">,
): Promise<CodexCommandResult> {
  try {
    const result = await options.runner.run({
      executablePath: options.executablePath,
      args: request.args,
      prompt: request.prompt,
      onProgress: controls.onProgress,
      isCancellationRequested: controls.isCancellationRequested,
    });
    return {
      exitCode: result.exitCode,
      stdout: redactSensitiveText(result.stdout),
      stderr: redactSensitiveText(result.stderr),
    };
  } catch (error) {
    if (error instanceof CodexCommandFailedError) throw error;
    if (error instanceof Error) throw new CodexRunnerError(redactSensitiveText(error.message));
    throw new CodexRunnerError("Codex command failed with an unknown non-error value.");
  }
}

function assertNever(value: never): never {
  throw new UnhandledProviderStatusError();
}
