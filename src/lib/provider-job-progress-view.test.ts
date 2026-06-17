import { describe, expect, test } from "bun:test";
import type { ProviderJob } from "./provider-job-manager";
import { createProviderJobProgressView } from "./provider-job-progress-view";

describe("provider job progress view", () => {
  test("summarizes a running job with partial artifacts and cancel availability", () => {
    const view = createProviderJobProgressView({
      stageLabel: "슬라이드 이미지 생성",
      job: runningJob(),
      recovered: true,
    });

    expect(view.stageLabel).toBe("슬라이드 이미지 생성");
    expect(view.jobId).toBe("job_progress_view");
    expect(view.percent).toBe(45);
    expect(view.canCancel).toBe(true);
    expect(view.canRetry).toBe(false);
    expect(view.recovered).toBe(true);
    expect(view.artifacts[0]?.label).toBe("Slide 1 preview");
  });

  test("summarizes failed jobs without exposing raw multiline logs or secrets", () => {
    const view = createProviderJobProgressView({
      stageLabel: "슬라이드 이미지 생성",
      job: {
        ...runningJob(),
        status: "failed",
        finishedAt: 20,
        errorMessage:
          "temporary provider outage\n    at internal/render.ts token=sk-secret123456789",
      },
      recovered: false,
    });

    expect(view.canCancel).toBe(false);
    expect(view.canRetry).toBe(true);
    expect(view.failureSummary?.includes("temporary provider outage")).toBe(true);
    expect(view.failureSummary?.includes("internal/render.ts")).toBe(false);
    expect(view.failureSummary?.includes("sk-secret")).toBe(false);
  });
});

function runningJob(): ProviderJob {
  return {
    id: "job_progress_view",
    providerId: "mock",
    capability: "imageGeneration",
    description: "Generate slide images",
    status: "running",
    createdAt: 10,
    startedAt: 11,
    attempt: 1,
    progress: { percent: 45, message: "Drafting slide images" },
    cancelRequested: false,
    partialResult: {
      kind: "preview",
      label: "Slide 1 preview",
      artifactId: "slide_1_preview",
    },
  };
}
