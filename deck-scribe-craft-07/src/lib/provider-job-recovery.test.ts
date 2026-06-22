import { describe, expect, test } from "bun:test";
import type { ProviderJob } from "./provider-job-manager";
import {
  findRecoveredProviderJob,
  parseProviderJobRecoverySnapshot,
  providerJobRecoveryKey,
  serializeProviderJobRecoverySnapshot,
} from "./provider-job-recovery";

describe("provider job recovery", () => {
  test("round-trips a job snapshot and restores by job id", () => {
    const raw = serializeProviderJobRecoverySnapshot({
      projectId: "p_jobs",
      step: "generate",
      currentJobId: "job_restore",
      jobs: [jobFixture()],
    });

    const snapshot = parseProviderJobRecoverySnapshot(raw);

    expect(providerJobRecoveryKey("p_jobs", "generate")).toBe(
      "deckforge.provider.jobs.v1.p_jobs.generate",
    );
    expect(snapshot?.currentJobId).toBe("job_restore");
    expect(snapshot ? findRecoveredProviderJob(snapshot, "job_restore")?.id : undefined).toBe(
      "job_restore",
    );
  });

  test("rejects malformed recovery text", () => {
    expect(parseProviderJobRecoverySnapshot("{bad json")).toBe(undefined);
    expect(parseProviderJobRecoverySnapshot(JSON.stringify({ currentJobId: "job_missing" }))).toBe(
      undefined,
    );
  });

  test("rejects snapshots with any malformed job entry", () => {
    // Given
    const raw = JSON.stringify({
      projectId: "p_jobs",
      step: "generate",
      currentJobId: "job_restore",
      jobs: [jobFixture(), { ...jobFixture(), id: 42 }],
    });

    // When
    const snapshot = parseProviderJobRecoverySnapshot(raw);

    // Then
    expect(snapshot).toBe(undefined);
  });

  test("rejects snapshots whose current job is absent", () => {
    // Given
    const raw = JSON.stringify({
      projectId: "p_jobs",
      step: "generate",
      currentJobId: "job_missing",
      jobs: [jobFixture()],
    });

    // When
    const snapshot = parseProviderJobRecoverySnapshot(raw);

    // Then
    expect(snapshot).toBe(undefined);
  });
});

function jobFixture(): ProviderJob {
  return {
    id: "job_restore",
    providerId: "mock",
    capability: "imageGeneration",
    description: "Generate slide images",
    status: "running",
    createdAt: 1,
    startedAt: 2,
    attempt: 1,
    progress: { percent: 30, message: "Generating previews" },
    cancelRequested: false,
  };
}
