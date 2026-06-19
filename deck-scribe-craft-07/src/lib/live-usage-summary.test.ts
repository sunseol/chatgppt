import { describe, expect, test } from "bun:test";
import {
  evaluateLiveUsageSummary,
  formatLiveUsageSummary,
  type LiveUsageStageSummary,
} from "./live-usage-summary";

describe("live usage summary", () => {
  test("passes stage-level provider, duration, retry, usage, and billing disclosure", () => {
    // Given
    const stages = completeStages();

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result).toEqual({ kind: "ready" });
  });

  test("formats estimated costs as estimates instead of exact charges", () => {
    // Given
    const stages = completeStages();

    // When
    const summary = formatLiveUsageSummary(stages);

    // Then
    expect(summary.includes("DF-244 Live Usage Summary")).toBe(true);
    expect(summary.includes("generate · openaiImage · 1200ms · retries 1")).toBe(true);
    expect(summary.includes("cost estimate $0.1800")).toBe(true);
    expect(summary.includes("API key billing confirmed")).toBe(true);
  });

  test("blocks missing usage, unlabelled cost, invalid timings, and image billing ambiguity", () => {
    // Given
    const stages: readonly LiveUsageStageSummary[] = [
      {
        ...stage("research"),
        providerUsageProvided: true,
        usage: undefined,
      },
      {
        ...stage("plan"),
        durationMs: -1,
        retryCount: -1,
      },
      {
        ...stage("generate"),
        usage: { imageCount: 5, estimatedCostUsd: 0.2 },
        costLabel: "hidden",
        imageBillingDisclosure: undefined,
      },
    ];

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_provider_usage_summary",
      "invalid_duration",
      "invalid_retry_count",
      "unlabelled_estimated_cost",
      "missing_image_billing_confirmation",
    ]);
  });

  test("blocks empty usage objects when provider usage was supplied", () => {
    // Given
    const stages = [
      stage("plan", {
        providerUsageProvided: true,
        usage: {},
      }),
    ];

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_provider_usage_summary"]);
  });

  test("blocks estimated provider costs labelled as actual charges", () => {
    // Given
    const stages = [
      stage("generate", {
        providerKind: "openaiImage",
        usage: { imageCount: 5, estimatedCostUsd: 0.2 },
        costLabel: "actual",
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "API key billing confirmed",
        },
      }),
    ];

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["estimated_cost_marked_actual"]);
  });

  test("blocks impossible usage and cost amounts", () => {
    // Given
    const disclosure = {
      apiKeyRequired: true,
      userConfirmed: true,
      label: "API key billing confirmed",
    };
    const stages = [
      stage("plan", {
        providerUsageProvided: true,
        usage: { inputTokens: -1, outputTokens: 0.5 },
      }),
      stage("generate", {
        providerKind: "openaiImage",
        usage: {
          imageCount: -2,
          estimatedCostUsd: Number.NaN,
          imageBillingDisclosure: disclosure,
        },
        costLabel: "estimate",
      }),
    ];

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "invalid_usage_amount",
      "invalid_usage_amount",
      "invalid_cost_amount",
    ]);
  });
});

function completeStages(): readonly LiveUsageStageSummary[] {
  return [
    stage("research"),
    stage("plan", { usage: { inputTokens: 1_000, outputTokens: 500 } }),
    stage("generate", {
      providerKind: "openaiImage",
      durationMs: 1_200,
      retryCount: 1,
      usage: {
        imageCount: 5,
        estimatedCostUsd: 0.18,
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "API key billing confirmed",
        },
      },
      costLabel: "estimate",
    }),
  ];
}

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
