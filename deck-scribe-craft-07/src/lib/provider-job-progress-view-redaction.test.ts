import { describe, expect, test } from "bun:test";
import type { ProviderJob } from "./provider-job-manager";
import { createProviderJobProgressView } from "./provider-job-progress-view";

describe("provider job progress view redaction", () => {
  test("redacts secret-like text from image usage labels", () => {
    // Given
    const job: ProviderJob = {
      id: "job_progress_redaction",
      providerId: "openaiImage",
      capability: "imageGeneration",
      description: "Generate slide images",
      status: "succeeded",
      createdAt: 10,
      startedAt: 11,
      finishedAt: 211,
      attempt: 1,
      cancelRequested: false,
      usageSummary: {
        imageCount: 1,
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "Codex image usage confirmed OPENAI_API_KEY=sk-live-secret123",
          confirmationEvidencePath: "usage/image-billing-confirmation.json",
        },
      },
    };

    // When
    const view = createProviderJobProgressView({
      stageLabel: "Live image generation",
      job,
      recovered: false,
    });

    // Then
    expect(view.usageItems.join(" ").includes("sk-live-secret123")).toBe(false);
    expect(view.usageItems.includes("Codex image usage confirmed OPENAI_API_KEY=[redacted]")).toBe(
      true,
    );
  });
});
