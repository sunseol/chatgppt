import { describe, expect, test } from "bun:test";
import { createProviderJobManager, ProviderJobNotFoundError } from "./provider-job-manager";

describe("provider job manager", () => {
  test("records a successful queued to succeeded lifecycle", async () => {
    const manager = createProviderJobManager({
      createId: () => "job_1",
      now: (() => {
        let time = 10;
        return () => time++;
      })(),
    });

    const queued = manager.enqueue({
      providerId: "mock",
      capability: "deckPlan",
      description: "Create deck plan",
    });
    const completed = await manager.run(queued.id, async () => "done");

    expect(completed).toEqual({
      id: "job_1",
      providerId: "mock",
      capability: "deckPlan",
      description: "Create deck plan",
      status: "succeeded",
      createdAt: 10,
      startedAt: 11,
      finishedAt: 12,
      attempt: 1,
      cancelRequested: false,
      output: "done",
    });
  });

  test("records a failed lifecycle with a readable error", async () => {
    const manager = createProviderJobManager({
      createId: () => "job_2",
      now: (() => {
        let time = 20;
        return () => time++;
      })(),
    });

    const queued = manager.enqueue({
      providerId: "mock",
      capability: "imageGeneration",
      description: "Generate slide image",
    });
    const completed = await manager.run(queued.id, async () => {
      throw new TypeError("image auth unavailable");
    });

    expect(completed).toEqual({
      id: "job_2",
      providerId: "mock",
      capability: "imageGeneration",
      description: "Generate slide image",
      status: "failed",
      createdAt: 20,
      startedAt: 21,
      finishedAt: 22,
      attempt: 1,
      cancelRequested: false,
      errorMessage: "image auth unavailable",
    });
  });

  test("records progress updates for a long-running job", async () => {
    const manager = createProviderJobManager({
      createId: () => "job_progress",
      now: (() => {
        let time = 30;
        return () => time++;
      })(),
    });

    const queued = manager.enqueue({
      providerId: "codex",
      capability: "deckPlan",
      description: "Create deck plan through Codex",
    });
    const completed = await manager.run(queued.id, async (job) => {
      job.reportProgress({ percent: 45, message: "Drafting outline" });
      return "planned";
    });

    expect(completed.progress).toEqual({ percent: 45, message: "Drafting outline" });
  });

  test("exposes cancellation intent to running work", async () => {
    const manager = createProviderJobManager({
      createId: () => "job_cancel",
    });

    const queued = manager.enqueue({
      providerId: "codex",
      capability: "layoutPrototype",
      description: "Generate layout through Codex",
    });
    const completed = await manager.run(queued.id, async (job) => {
      manager.requestCancellation(queued.id);
      return job.isCancellationRequested();
    });

    expect(completed.cancelRequested).toBe(true);
    expect(completed.output).toBe(true);
  });

  test("throws a typed error when updating a missing job", () => {
    const manager = createProviderJobManager();

    expect(() => manager.reportProgress("missing", { percent: 1, message: "Starting" })).toThrow(
      ProviderJobNotFoundError,
    );
    expect(() => manager.requestCancellation("missing")).toThrow(ProviderJobNotFoundError);
  });

  test("retries a failed job without carrying previous result fields", async () => {
    const manager = createProviderJobManager({
      createId: () => "job_retry",
      now: (() => {
        let time = 40;
        return () => time++;
      })(),
    });
    const queued = manager.enqueue({
      providerId: "codex",
      capability: "research",
      description: "Research topic",
    });
    await manager.run(queued.id, async () => {
      throw new TypeError("temporary provider failure");
    });

    const retried = manager.retry(queued.id);

    expect(retried).toEqual({
      id: "job_retry",
      providerId: "codex",
      capability: "research",
      description: "Research topic",
      status: "queued",
      createdAt: 43,
      attempt: 2,
      cancelRequested: false,
    });
  });

  test("fails timed-out work without storing late output", async () => {
    let time = 100;
    const manager = createProviderJobManager({
      createId: () => "job_timeout",
      now: () => time,
    });
    const queued = manager.enqueue({
      providerId: "codex",
      capability: "deckPlan",
      description: "Plan deck",
      timeoutMs: 5,
    });

    const completed = await manager.run(queued.id, async () => {
      time = 106;
      return "late output";
    });

    expect(completed.status).toBe("failed");
    expect(completed.errorMessage).toBe('Provider job "job_timeout" timed out.');
    expect("output" in completed).toBe(false);
  });

  test("keeps partial result and usage summary in completed job state", async () => {
    const manager = createProviderJobManager({ createId: () => "job_partial" });
    const queued = manager.enqueue({
      providerId: "openaiImage",
      capability: "imageGeneration",
      description: "Generate image",
    });

    const completed = await manager.run(queued.id, async (job) => {
      job.recordPartialResult({ kind: "preview", artifactId: "preview_1" });
      job.recordUsageSummary({
        inputTokens: 120,
        outputTokens: 30,
        imageCount: 1,
        estimatedCostUsd: 0.12,
      });
      return "image artifact";
    });

    expect(completed.partialResult).toEqual({ kind: "preview", artifactId: "preview_1" });
    expect(completed.usageSummary).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      imageCount: 1,
      estimatedCostUsd: 0.12,
    });
  });

  test("restores jobs from a recovery snapshot", async () => {
    const manager = createProviderJobManager({ createId: () => "job_restore" });
    const queued = manager.enqueue({
      providerId: "mock",
      capability: "deckPlan",
      description: "Plan deck",
    });
    const completed = await manager.run(queued.id, async () => "planned");

    const restored = createProviderJobManager({ initialJobs: manager.snapshot() });

    expect(restored.get(completed.id)).toEqual(completed);
  });
});
