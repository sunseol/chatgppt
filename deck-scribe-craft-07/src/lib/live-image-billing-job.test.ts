import { describe, expect, test } from "bun:test";
import { createProviderJobManager } from "./provider-job-manager";
import { prepareCodexImageBillingJob } from "./live-image-billing-job";

describe("Codex image billing job preparation", () => {
  test("records confirmed Codex billing usage before live image generation", async () => {
    // Given
    const storage = new MemoryStorage();
    const manager = createProviderJobManager({ createId: () => "job_generate_1" });
    const queued = manager.enqueue({
      providerId: "codex",
      capability: "imageGeneration",
      description: "Generate images",
    });

    // When
    const result = await prepareCodexImageBillingJob({
      projectId: "project_001",
      jobId: queued.id,
      providerId: "codex",
      slideCount: 2,
      manager,
      storage,
      confirm: () => true,
      now: () => 1_789_942_001,
    });

    // Then
    expect(result.kind).toBe("confirmed");
    expect(result.job.usageSummary).toEqual({
      imageCount: 2,
      imageBillingDisclosure: {
        apiKeyRequired: false,
        userConfirmed: true,
        label: "Codex image usage confirmed",
        confirmationEvidencePath:
          "usage/project_001/job_generate_1/image-billing-confirmation.json",
      },
    });
  });

  test("cancels the queued Codex image job when billing confirmation is declined", async () => {
    // Given
    const manager = createProviderJobManager({ createId: () => "job_generate_1" });
    const queued = manager.enqueue({
      providerId: "codex",
      capability: "imageGeneration",
      description: "Generate images",
    });

    // When
    const result = await prepareCodexImageBillingJob({
      projectId: "project_001",
      jobId: queued.id,
      providerId: "codex",
      slideCount: 2,
      manager,
      storage: new MemoryStorage(),
      confirm: () => false,
      now: () => 1_789_942_001,
    });

    // Then
    expect(result.kind).toBe("cancelled");
    expect(result.job.status).toBe("cancelled");
    expect(manager.get(queued.id)?.status).toBe("cancelled");
  });
});

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    let currentIndex = 0;
    for (const key of this.values.keys()) {
      if (currentIndex === index) return key;
      currentIndex += 1;
    }
    return null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
