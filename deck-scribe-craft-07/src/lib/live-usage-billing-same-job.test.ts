import { describe, expect, test } from "bun:test";
import { createProviderJobSummaryAuditEvent, formatAuditLogForReport } from "./audit-log";
import type { ProviderJob } from "./provider-job-manager";
import { createProviderJobProgressView } from "./provider-job-progress-view";
import {
  evaluateLiveUsageSummary,
  formatLiveUsageSummary,
  type LiveUsageStageSummary,
} from "./live-usage-summary";

const MISMATCHED_DISCLOSURE = {
  apiKeyRequired: false,
  userConfirmed: true,
  label: "Codex image usage confirmed",
  confirmationEvidencePath: "usage/project-alpha/job_previous/image-billing-confirmation.json",
};

describe("live usage billing evidence job binding", () => {
  test("blocks image confirmation evidence from a different job", () => {
    const stages: readonly LiveUsageStageSummary[] = [
      imageStage({
        jobId: "job_current",
        imageBillingDisclosure: MISMATCHED_DISCLOSURE,
      }),
    ];

    const result = evaluateLiveUsageSummary(stages);
    const summary = formatLiveUsageSummary(stages);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_image_billing_confirmation",
    ]);
    expect(summary.includes("Codex image usage not confirmed")).toBe(true);
    expect(summary.includes("Codex image usage confirmed")).toBe(false);
  });

  test("does not show mismatched job evidence as confirmed on app or report surfaces", () => {
    const job = providerImageJob("job_current", MISMATCHED_DISCLOSURE);
    const view = createProviderJobProgressView({
      stageLabel: "Live image generation",
      job,
      recovered: false,
    });
    const event = createProviderJobSummaryAuditEvent(job, {
      eventId: "evt_provider_image_billing",
      traceId: "trace_provider_image_billing",
      timestamp: 2_600,
      stage: "generate",
    });

    const report = formatAuditLogForReport([event]);

    expect(view.usageItems).toEqual(["images 1", "Codex image usage not confirmed"]);
    expect(report.includes("Codex image usage not confirmed")).toBe(true);
    expect(report.includes("Codex image usage confirmed")).toBe(false);
  });
});

function imageStage(patch: Partial<LiveUsageStageSummary> = {}): LiveUsageStageSummary {
  return {
    stageId: "generate",
    providerKind: "openaiImage",
    durationMs: 1200,
    retryCount: 0,
    providerUsageProvided: true,
    usage: { imageCount: 1 },
    costLabel: "hidden",
    ...patch,
  };
}

function providerImageJob(
  id: string,
  imageBillingDisclosure: NonNullable<LiveUsageStageSummary["imageBillingDisclosure"]>,
): ProviderJob {
  return {
    id,
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
      imageBillingDisclosure,
    },
  };
}
