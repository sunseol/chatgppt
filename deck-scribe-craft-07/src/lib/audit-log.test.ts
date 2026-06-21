import { describe, expect, test } from "bun:test";
import {
  createAuditLogEvent,
  createProviderJobSummaryAuditEvent,
  formatAuditLogForReport,
} from "./audit-log";
import { createProviderJobManager } from "./provider-job-manager";

describe("full audit log", () => {
  test("records trace lineage and redacts sensitive event messages", () => {
    const event = createAuditLogEvent({
      eventId: "evt_regen_001",
      eventType: "regeneration.requested",
      traceId: "trace_slide_1_regen",
      timestamp: 2_000,
      stage: "generate",
      message: "retry with Authorization: Bearer sk-live-secret",
      artifactLineage: {
        artifactId: "slide_1_v4",
        artifactHash: "sha256:slide",
        artifactType: "generated_slide",
        upstreamArtifactIds: ["layout_001", "prompt_slide_1"],
      },
    });

    expect(event.traceId).toBe("trace_slide_1_regen");
    expect(event.artifactLineage?.upstreamArtifactIds).toEqual(["layout_001", "prompt_slide_1"]);
    expect(event.message).toBe("retry with Authorization: Bearer [redacted]");
    expect(JSON.stringify(event).includes("sk-live-secret")).toBe(false);
  });

  test("records provider usage summary without provider output", async () => {
    const manager = createProviderJobManager({ createId: () => "job_audit_full" });
    const queued = manager.enqueue({
      providerId: "openaiImage",
      capability: "imageGeneration",
      description: "Generate slide image",
    });
    const completed = await manager.run(queued.id, async (job) => {
      job.recordUsageSummary({
        inputTokens: 120,
        outputTokens: 30,
        imageCount: 1,
        estimatedCostUsd: 0.04,
      });
      return "OPENAI_API_KEY=sk-live-output";
    });

    const event = createProviderJobSummaryAuditEvent(completed, {
      eventId: "evt_provider_001",
      traceId: "trace_provider_001",
      timestamp: 2_500,
      stage: "generate",
      artifactLineage: {
        artifactId: "slide_1_v1",
        artifactHash: "sha256:generated",
        artifactType: "generated_slide",
        upstreamArtifactIds: ["layout_001"],
      },
    });

    expect(event.eventType).toBe("provider.job.summary");
    expect(event.usageSummary).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      imageCount: 1,
      estimatedCostUsd: 0.04,
    });
    expect(JSON.stringify(event).includes("sk-live-output")).toBe(false);
  });

  test("labels estimated provider costs as estimates in reports", () => {
    // Given
    const event = createAuditLogEvent({
      eventId: "evt_provider_cost",
      eventType: "provider.job.summary",
      traceId: "trace_provider_cost",
      timestamp: 2_500,
      stage: "generate",
      usageSummary: {
        inputTokens: 120,
        outputTokens: 30,
        imageCount: 1,
        estimatedCostUsd: 0.04,
      },
    });

    // When
    const report = formatAuditLogForReport([event]);

    // Then
    expect(report.includes("cost estimate $0.0400")).toBe(true);
    expect(report.includes("cost $0.0400")).toBe(false);
  });

  test("preserves Codex image usage disclosure in report usage", () => {
    const event = createAuditLogEvent({
      eventId: "evt_provider_image_billing",
      eventType: "provider.job.summary",
      traceId: "trace_provider_image_billing",
      timestamp: 2_600,
      stage: "generate",
      usageSummary: {
        imageCount: 5,
        estimatedCostUsd: 0.18,
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath:
            "usage/project-alpha/job-generate/image-billing-confirmation.json",
        },
      },
    });

    const report = formatAuditLogForReport([event]);

    expect(event.usageSummary?.imageBillingDisclosure).toEqual({
      apiKeyRequired: true,
      userConfirmed: true,
      label: "Codex image usage confirmed",
      confirmationEvidencePath: "usage/project-alpha/job-generate/image-billing-confirmation.json",
    });
    expect(report.includes("images 5")).toBe(true);
    expect(report.includes("Codex image usage confirmed")).toBe(true);
  });

  test("does not render image usage confirmation without persisted evidence", () => {
    const event = createAuditLogEvent({
      eventId: "evt_provider_image_billing_missing_evidence",
      eventType: "provider.job.summary",
      traceId: "trace_provider_image_billing_missing_evidence",
      timestamp: 2_600,
      stage: "generate",
      usageSummary: {
        imageCount: 5,
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "Codex image usage confirmed",
        },
      },
    });

    const report = formatAuditLogForReport([event]);

    expect(report.includes("Codex image usage not confirmed")).toBe(true);
    expect(report.includes("Codex image usage confirmed")).toBe(false);
  });
});
