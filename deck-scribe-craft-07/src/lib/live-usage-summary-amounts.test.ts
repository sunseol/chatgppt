import { describe, expect, test } from "bun:test";
import { evaluateLiveUsageSummary, type LiveUsageStageSummary } from "./live-usage-summary";

describe("live usage summary amount validation", () => {
  test("blocks impossible usage and cost amounts", () => {
    const stages = [
      stage("plan", {
        providerUsageProvided: true,
        usage: { inputTokens: -1, outputTokens: 0.5 },
      }),
      stage("generate", {
        jobId: "job-generate",
        providerKind: "openaiImage",
        usage: {
          imageCount: -2,
          estimatedCostUsd: Number.NaN,
          imageBillingDisclosure: {
            apiKeyRequired: false,
            userConfirmed: true,
            label: "Codex image usage confirmed",
            confirmationEvidencePath:
              "usage/project-alpha/job-generate/image-billing-confirmation.json",
          },
        },
        costLabel: "estimate",
      }),
    ];

    const result = evaluateLiveUsageSummary(stages);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "invalid_usage_amount",
      "invalid_usage_amount",
      "invalid_cost_amount",
    ]);
  });
});

function stage(stageId: string, patch: Partial<LiveUsageStageSummary> = {}): LiveUsageStageSummary {
  return {
    stageId,
    providerKind: "codex",
    durationMs: 800,
    retryCount: 0,
    providerUsageProvided: false,
    costLabel: "hidden",
    ...patch,
  };
}
