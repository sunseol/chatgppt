import { describe, expect, test } from "bun:test";
import { ImageArtifactStoreError, type ImageArtifactStoreWrite } from "./image-artifact-store";
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

  test("mirrors confirmed Codex billing record into evidence storage before generation", async () => {
    // Given
    const storage = new MemoryStorage();
    const writes: ImageArtifactStoreWrite[] = [];
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
      evidenceStore: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      confirm: () => true,
      now: () => 1_789_942_001,
    });

    // Then
    expect(result.kind).toBe("confirmed");
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_001/usage/project_001/job_generate_1/image-billing-confirmation.json",
    ]);
    const content = writes[0]?.content;
    if (typeof content !== "string") throw new Error("Expected confirmation evidence JSON.");
    expect(JSON.parse(content)).toEqual({
      type: "deckforge_live_image_billing_confirmation",
      version: 1,
      projectId: "project_001",
      jobId: "job_generate_1",
      providerId: "codex",
      evidencePath: "usage/project_001/job_generate_1/image-billing-confirmation.json",
      label: "Codex image usage confirmed",
      apiKeyRequired: false,
      billingOwner: "codex_oauth_account",
      confirmedAt: 1_789_942_001,
    });
  });

  test("cancels the queued Codex image job when confirmation evidence cannot be written", async () => {
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
      evidenceStore: {
        write: async () => {
          throw new ImageArtifactStoreError("storage full");
        },
      },
      confirm: () => true,
      now: () => 1_789_942_001,
    });

    // Then
    expect(result.kind).toBe("cancelled");
    if (result.kind !== "cancelled") throw new Error("Expected cancelled billing result.");
    expect(result.reason).toBe("evidence_write_failed");
    expect(result.job.status).toBe("cancelled");
    expect(manager.get(queued.id)?.status).toBe("cancelled");
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
