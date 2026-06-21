import { describe, expect, test } from "bun:test";
import type { ProviderJob } from "./provider-job-manager";
import { createProviderJobProgressView } from "./provider-job-progress-view";
import {
  evaluateLiveUsageSummary,
  formatLiveUsageSummary,
  type LiveUsageStageSummary,
} from "./live-usage-summary";

describe("live usage summary image usage evidence", () => {
  test("blocks confirmed-looking image usage when confirmation evidence is missing", () => {
    // Given
    const stages: readonly LiveUsageStageSummary[] = [
      {
        stageId: "generate",
        providerKind: "openaiImage",
        durationMs: 1200,
        retryCount: 0,
        providerUsageProvided: true,
        usage: { imageCount: 1 },
        costLabel: "hidden",
        imageBillingDisclosure: {
          apiKeyRequired: false,
          userConfirmed: true,
          label: "Codex image usage confirmed",
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

  test("blocks template image usage confirmation evidence paths", () => {
    // Given
    const stages: readonly LiveUsageStageSummary[] = [
      {
        stageId: "generate",
        providerKind: "openaiImage",
        durationMs: 1200,
        retryCount: 0,
        providerUsageProvided: true,
        usage: { imageCount: 1 },
        costLabel: "hidden",
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath: "usage/image-billing-template.json",
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

  test("blocks generic image usage confirmation evidence paths", () => {
    // Given
    const stages: readonly LiveUsageStageSummary[] = [
      {
        stageId: "generate",
        providerKind: "openaiImage",
        durationMs: 1200,
        retryCount: 0,
        providerUsageProvided: true,
        usage: { imageCount: 1 },
        costLabel: "hidden",
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath: "usage/generic-confirmation.json",
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

  test("does not render confirmed-looking image usage without evidence", () => {
    // Given
    const job: ProviderJob = {
      id: "job_billing_evidence",
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
          apiKeyRequired: false,
          userConfirmed: true,
          label: "Codex image usage confirmed",
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

  test("does not render template image usage evidence paths as confirmed", () => {
    // Given
    const job: ProviderJob = {
      id: "job_billing_template",
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
          label: "Codex image usage confirmed",
          confirmationEvidencePath: "usage/image-billing-template.json",
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

  test("does not format confirmed-looking image usage without persisted evidence", () => {
    // Given
    const stages: readonly LiveUsageStageSummary[] = [
      {
        stageId: "generate",
        providerKind: "openaiImage",
        durationMs: 1200,
        retryCount: 0,
        providerUsageProvided: true,
        usage: { imageCount: 1 },
        costLabel: "hidden",
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "Codex image usage confirmed",
        },
      },
    ];

    // When
    const summary = formatLiveUsageSummary(stages);

    // Then
    expect(summary.includes("Codex image usage not confirmed")).toBe(true);
    expect(summary.includes("Codex image usage confirmed")).toBe(false);
  });
});
