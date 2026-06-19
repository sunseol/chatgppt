import { describe, expect, test } from "bun:test";
import { evaluateLiveUsageSummary, type LiveUsageStageSummary } from "./live-usage-summary";

describe("live usage summary cost label taxonomy", () => {
  test("blocks provider cost with an unsupported runtime cost label", () => {
    // Given
    const stages = [
      runtimeStage({
        stageId: "generate",
        providerKind: "openaiImage",
        durationMs: 1_200,
        retryCount: 0,
        providerUsageProvided: true,
        usage: {
          imageCount: 1,
          estimatedCostUsd: 0.18,
          imageBillingDisclosure: {
            apiKeyRequired: true,
            userConfirmed: true,
            label: "API key billing confirmed",
            confirmationEvidencePath: "usage/image-billing-confirmation.json",
          },
        },
        costLabel: "approximate",
      }),
    ];

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_cost_label"]);
  });
});

function runtimeStage(value: object): LiveUsageStageSummary {
  return JSON.parse(JSON.stringify(value));
}
