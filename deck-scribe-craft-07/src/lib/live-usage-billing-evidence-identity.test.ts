import { describe, expect, test } from "bun:test";
import type { ProviderJob } from "./provider-job-manager";
import { createProviderJobProgressView } from "./provider-job-progress-view";
import { evaluateLiveUsageSummary, type LiveUsageStageSummary } from "./live-usage-summary";

const PADDED_CONFIRMATION_PATH =
  " usage/project-alpha/job-generate/image-billing-confirmation.json ";

describe("live usage billing evidence identity", () => {
  test("blocks confirmation evidence paths that rely on boundary whitespace", () => {
    // Given
    const stages: readonly LiveUsageStageSummary[] = [
      {
        stageId: "generate",
        providerKind: "codex",
        durationMs: 1200,
        retryCount: 0,
        providerUsageProvided: true,
        usage: { imageCount: 1 },
        costLabel: "hidden",
        imageBillingDisclosure: {
          apiKeyRequired: false,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath: PADDED_CONFIRMATION_PATH,
        },
      },
    ];

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_image_billing_confirmation",
    ]);
  });

  test("renders padded confirmation evidence paths as not confirmed", () => {
    // Given
    const job: ProviderJob = {
      id: "job_billing_padded",
      providerId: "codex",
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
          apiKeyRequired: false,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath: PADDED_CONFIRMATION_PATH,
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
    expect(view.usageItems).toEqual(["images 1", "Codex image usage not confirmed"]);
  });
});
