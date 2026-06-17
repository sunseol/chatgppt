import { describe, expect, test } from "bun:test";
import { createCodexExecutionAdapter } from "./codex-execution-adapter";
import { createProviderJobManager } from "./provider-job-manager";

describe("Codex execution adapter", () => {
  test("runs a connected Codex command through a provider job with redacted output", async () => {
    const manager = createProviderJobManager({ createId: () => "job_codex_1" });
    const adapter = createCodexExecutionAdapter({
      executablePath: "/usr/local/bin/codex",
      status: {
        kind: "connected",
        providerId: "codex",
        message: "Codex is connected.",
      },
      jobManager: manager,
      runner: {
        run: async (input) => {
          input.onProgress({ percent: 25, message: "Starting Codex" });
          return {
            exitCode: 0,
            stdout: `using ${input.executablePath} OPENAI_API_KEY=sk-live-secret123`,
            stderr: "Authorization: Bearer codex.session.secret",
          };
        },
      },
    });

    const job = await adapter.run({
      capability: "deckPlan",
      description: "Create deck plan",
      prompt: "Plan a deck",
      args: ["exec", "--json"],
    });

    expect(job.status).toBe("succeeded");
    expect(job.progress).toEqual({ percent: 25, message: "Starting Codex" });
    expect(job.output).toEqual({
      exitCode: 0,
      stdout: "using /usr/local/bin/codex OPENAI_API_KEY=[redacted]",
      stderr: "Authorization: Bearer [redacted]",
    });
  });

  test("fails without invoking the runner when Codex is not connected", async () => {
    let callCount = 0;
    const adapter = createCodexExecutionAdapter({
      executablePath: "/usr/local/bin/codex",
      status: {
        kind: "requiresAuth",
        providerId: "codex",
        message: "Sign in with ChatGPT.",
      },
      jobManager: createProviderJobManager({ createId: () => "job_codex_auth" }),
      runner: {
        run: async () => {
          callCount += 1;
          return { exitCode: 0, stdout: "unused", stderr: "" };
        },
      },
    });

    const job = await adapter.run({
      capability: "interview",
      description: "Create interview",
      prompt: "Interview the user",
      args: ["exec"],
    });

    expect(callCount).toBe(0);
    expect(job.status).toBe("failed");
    expect(job.errorMessage).toBe("Codex is not connected: Sign in with ChatGPT.");
  });

  test("redacts failure output before storing the job error", async () => {
    const adapter = createCodexExecutionAdapter({
      executablePath: "/usr/local/bin/codex",
      status: {
        kind: "connected",
        providerId: "codex",
        message: "Codex is connected.",
      },
      jobManager: createProviderJobManager({ createId: () => "job_codex_fail" }),
      runner: {
        run: async () => ({
          exitCode: 2,
          stdout: "ignored",
          stderr: "token=abc123def456",
        }),
      },
    });

    const job = await adapter.run({
      capability: "research",
      description: "Research a topic",
      prompt: "Research",
      args: ["exec"],
    });

    expect(job.status).toBe("failed");
    expect(job.errorMessage).toBe("Codex command failed with exit code 2: token=[redacted]");
  });

  test("passes cancellation intent through to the command runner", async () => {
    const manager = createProviderJobManager({ createId: () => "job_codex_cancel" });
    let observedCancellation = false;
    const adapter = createCodexExecutionAdapter({
      executablePath: "/usr/local/bin/codex",
      status: {
        kind: "connected",
        providerId: "codex",
        message: "Codex is connected.",
      },
      jobManager: manager,
      runner: {
        run: async (input) => {
          manager.requestCancellation("job_codex_cancel");
          observedCancellation = input.isCancellationRequested();
          return { exitCode: 0, stdout: "cancel observed", stderr: "" };
        },
      },
    });

    const job = await adapter.run({
      capability: "layoutPrototype",
      description: "Generate layout",
      prompt: "Layout",
      args: ["exec"],
    });

    expect(observedCancellation).toBe(true);
    expect(job.cancelRequested).toBe(true);
  });
});
