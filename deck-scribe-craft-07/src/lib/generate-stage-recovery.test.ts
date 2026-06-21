import { describe, expect, test } from "bun:test";
import type { ProviderJob } from "./provider-job-manager";
import { readGenerateRecovery, writeGenerateRecovery } from "./generate-stage-recovery";

describe("generate stage recovery", () => {
  test("round-trips the current generate job through injected storage", () => {
    // Given
    const storage = new MemoryStorage();
    const job = providerJob();

    // When
    writeGenerateRecovery({
      projectId: "p_generate",
      currentJobId: job.id,
      jobs: [job],
      storage,
    });
    const recovery = readGenerateRecovery("p_generate", storage);

    // Then
    expect(recovery?.job.id).toBe("job_generate");
    expect(recovery?.snapshot.currentJobId).toBe("job_generate");
  });
});

function providerJob(): ProviderJob {
  return {
    id: "job_generate",
    providerId: "codex",
    capability: "imageGeneration",
    description: "Generate slide images",
    status: "running",
    createdAt: 1,
    startedAt: 2,
    attempt: 1,
    progress: { percent: 40, message: "Generating" },
    cancelRequested: false,
  };
}

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
