import { describe, expect, test } from "bun:test";
import { createPromptUsageRecord } from "./prompt-assets";
import { createProviderJobAuditEvent } from "./provider-job-audit";
import { createProviderJobManager } from "./provider-job-manager";

describe("provider job audit events", () => {
  test("includes usage summary but excludes provider output", async () => {
    const manager = createProviderJobManager({ createId: () => "job_audit_usage" });
    const queued = manager.enqueue({
      providerId: "openaiImage",
      capability: "imageGeneration",
      description: "Generate image",
    });
    const completed = await manager.run(queued.id, async (job) => {
      job.recordUsageSummary({ inputTokens: 10, outputTokens: 4, imageCount: 1 });
      return "OPENAI_API_KEY=sk-live-secret123";
    });

    const event = createProviderJobAuditEvent(completed);

    expect(event).toEqual({
      eventType: "provider.job.completed",
      jobId: "job_audit_usage",
      providerId: "openaiImage",
      capability: "imageGeneration",
      status: "succeeded",
      attempt: 1,
      usageSummary: { inputTokens: 10, outputTokens: 4, imageCount: 1 },
    });
    expect(JSON.stringify(event).includes("sk-live-secret123")).toBe(false);
  });

  test("redacts secret-like error messages", async () => {
    const manager = createProviderJobManager({ createId: () => "job_audit_error" });
    const queued = manager.enqueue({
      providerId: "codex",
      capability: "research",
      description: "Research",
    });
    const failed = await manager.run(queued.id, async () => {
      throw new TypeError("token=abc123def456");
    });

    const event = createProviderJobAuditEvent(failed);

    expect(event.errorMessage).toBe("token=[redacted]");
    expect(JSON.stringify(event).includes("abc123def456")).toBe(false);
  });

  test("records prompt version metadata when supplied", async () => {
    const manager = createProviderJobManager({ createId: () => "job_audit_prompt" });
    const queued = manager.enqueue({
      providerId: "codex",
      capability: "research",
      description: "Research",
    });
    const completed = await manager.run(queued.id, async () => "ok");
    const promptUsage = createPromptUsageRecord({
      promptId: "research_plan",
      jobId: queued.id,
      recordedAt: 123,
    });

    const event = createProviderJobAuditEvent(completed, promptUsage);

    expect(event.promptUsage).toEqual({
      promptId: "research_plan",
      promptVersion: "v1",
      promptHash: promptUsage.promptHash,
      promptFilePath: "prompts/research_plan.v1.md",
      stage: "research",
    });
  });
});
