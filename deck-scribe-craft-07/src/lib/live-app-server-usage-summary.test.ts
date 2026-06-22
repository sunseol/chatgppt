import { describe, expect, test } from "bun:test";
import { evaluateLiveUsageSummary, formatLiveUsageSummary } from "./live-usage-summary";
import { createCodexAppServerUsageStageSummary } from "./live-app-server-usage-summary";

describe("Codex App Server usage summary", () => {
  test("records token usage notifications as DF-244 stage usage", () => {
    // Given
    const stage = createCodexAppServerUsageStageSummary({
      stageId: "df244_usage_probe",
      durationMs: 7_158,
      retryCount: 0,
      notifications: [
        {
          method: "thread/tokenUsage/updated",
          params: {
            threadId: "019edc53-3950-74e1-8287-36d66f29e87e",
            turnId: "019edc53-3bfe-76d3-912d-31769ee3fd3f",
            tokenUsage: {
              total: {
                totalTokens: 25_147,
                inputTokens: 25_006,
                cachedInputTokens: 2_432,
                outputTokens: 141,
                reasoningOutputTokens: 118,
              },
              last: {
                totalTokens: 25_147,
                inputTokens: 25_006,
                cachedInputTokens: 2_432,
                outputTokens: 141,
                reasoningOutputTokens: 118,
              },
              modelContextWindow: 258_400,
            },
          },
        },
      ],
    });

    // When
    const gate = evaluateLiveUsageSummary([stage]);
    const summary = formatLiveUsageSummary([stage]);

    // Then
    expect(gate).toEqual({ kind: "ready" });
    expect(stage.providerUsageProvided).toBe(true);
    expect(stage.usage).toEqual({ inputTokens: 25_006, outputTokens: 141 });
    expect(summary.includes("df244_usage_probe · codex · 7158ms · retries 0")).toBe(true);
    expect(summary.includes("input 25006 · output 141")).toBe(true);
  });

  test("preserves richer App Server usage summaries with image disclosure and estimated cost", () => {
    // Given
    const stage = createCodexAppServerUsageStageSummary({
      stageId: "generate",
      jobId: "job-generate",
      durationMs: 197_953,
      retryCount: 2,
      notifications: [
        {
          method: "thread/tokenUsage/updated",
          params: {
            tokenUsage: {
              total: {
                inputTokens: 1_024,
                outputTokens: 256,
              },
            },
            usageSummary: {
              imageCount: 5,
              estimatedCostUsd: 0.18,
              imageBillingDisclosure: {
                apiKeyRequired: false,
                userConfirmed: true,
                label: "Codex image usage confirmed",
                confirmationEvidencePath:
                  "usage/project-alpha/job-generate/image-billing-confirmation.json",
              },
            },
          },
        },
      ],
    });

    // When
    const gate = evaluateLiveUsageSummary([stage]);
    const summary = formatLiveUsageSummary([stage]);

    // Then
    expect(gate).toEqual({ kind: "ready" });
    expect(stage.costLabel).toBe("estimate");
    expect(stage.usage).toEqual({
      inputTokens: 1_024,
      outputTokens: 256,
      imageCount: 5,
      estimatedCostUsd: 0.18,
      imageBillingDisclosure: {
        apiKeyRequired: false,
        userConfirmed: true,
        label: "Codex image usage confirmed",
        confirmationEvidencePath:
          "usage/project-alpha/job-generate/image-billing-confirmation.json",
      },
    });
    expect(summary.includes("input 1024 · output 256 · images 5")).toBe(true);
    expect(summary.includes("cost estimate $0.1800")).toBe(true);
    expect(summary.includes("Codex image usage confirmed")).toBe(true);
  });

  test("blocks malformed App Server cost payloads instead of silently hiding them", () => {
    // Given
    const stage = createCodexAppServerUsageStageSummary({
      stageId: "generate",
      jobId: "job-generate",
      durationMs: 197_953,
      retryCount: 2,
      notifications: [
        {
          method: "thread/tokenUsage/updated",
          params: {
            usageSummary: {
              imageCount: 5,
              estimatedCostUsd: "0.18",
              imageBillingDisclosure: {
                apiKeyRequired: false,
                userConfirmed: true,
                label: "Codex image usage confirmed",
                confirmationEvidencePath:
                  "usage/project-alpha/job-generate/image-billing-confirmation.json",
              },
            },
          },
        },
      ],
    });

    // When
    const gate = evaluateLiveUsageSummary([stage]);

    // Then
    expect(gate.kind).toBe("blocked");
    if (gate.kind !== "blocked") return;
    expect(gate.issues.map((issue) => issue.code)).toEqual(["invalid_cost_amount"]);
  });

  test("blocks malformed token usage notifications as invalid supplied usage", () => {
    // Given
    const stage = createCodexAppServerUsageStageSummary({
      stageId: "df244_usage_probe",
      durationMs: 1_000,
      retryCount: 0,
      notifications: [
        {
          method: "thread/tokenUsage/updated",
          params: {
            tokenUsage: {
              total: {
                inputTokens: "not-a-number",
              },
            },
          },
        },
      ],
    });

    // When
    const gate = evaluateLiveUsageSummary([stage]);

    // Then
    expect(gate.kind).toBe("blocked");
    if (gate.kind !== "blocked") return;
    expect(gate.issues.map((issue) => issue.code)).toEqual([
      "incomplete_text_token_usage",
      "invalid_usage_amount",
    ]);
  });
});
