import { describe, expect, test } from "bun:test";
import { evaluateLiveUsageSummary, type LiveUsageStageSummary } from "./live-usage-summary";

describe("live usage summary duration evidence", () => {
  test("blocks zero-duration provider stages from satisfying latency evidence", () => {
    // Given
    const stages: readonly LiveUsageStageSummary[] = [
      {
        stageId: "generate",
        jobId: "job-generate",
        providerKind: "openaiImage",
        durationMs: 0,
        retryCount: 0,
        providerUsageProvided: true,
        usage: { imageCount: 1 },
        costLabel: "hidden",
        imageBillingDisclosure: {
          apiKeyRequired: false,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath:
            "usage/project-alpha/job-generate/image-billing-confirmation.json",
        },
      },
    ];

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_duration"]);
  });
});
