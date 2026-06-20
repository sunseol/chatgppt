import { describe, expect, test } from "bun:test";
import { formatLiveUsageSummary } from "./live-usage-summary";

describe("live usage summary redaction", () => {
  test("redacts secret-like text from image billing labels", () => {
    // Given
    const stages = [
      {
        stageId: "generate",
        providerKind: "openaiImage",
        durationMs: 1200,
        retryCount: 0,
        providerUsageProvided: true,
        usage: {
          imageCount: 1,
          imageBillingDisclosure: {
            apiKeyRequired: true,
            userConfirmed: true,
            label: "API key billing confirmed OPENAI_API_KEY=sk-live-secret123",
            confirmationEvidencePath: "usage/image-billing-confirmation.json",
          },
        },
        costLabel: "hidden",
      },
    ] as const;

    // When
    const summary = formatLiveUsageSummary(stages);

    // Then
    expect(summary.includes("sk-live-secret123")).toBe(false);
    expect(summary.includes("OPENAI_API_KEY=[redacted]")).toBe(true);
  });
});
