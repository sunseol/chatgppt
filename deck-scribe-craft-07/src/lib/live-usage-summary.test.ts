import { describe, expect, test } from "bun:test";
import {
  evaluateLiveUsageSummary,
  formatLiveUsageSummary,
  type LiveUsageStageSummary,
} from "./live-usage-summary";

describe("live usage summary", () => {
  test("passes stage-level provider, duration, retry, usage, and image usage disclosure", () => {
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
    expect(summary.includes("Codex image usage confirmed")).toBe(true);
  });

  test("blocks missing usage, unlabelled cost, invalid timings, and image usage ambiguity", () => {
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
        jobId: "job-generate",
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

  test("blocks API-key image usage confirmation without persisted evidence", () => {
    // Given
    const stages = [
      stage("generate", {
        providerKind: "openaiImage",
        usage: { imageCount: 1 },
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "Codex image usage confirmed",
        },
      }),
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

  test("blocks API-key-required image usage confirmation even with persisted evidence", () => {
    // Given
    const stages = [
      stage("generate", {
        providerKind: "openaiImage",
        usage: { imageCount: 1 },
        imageBillingDisclosure: {
          apiKeyRequired: true,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath:
            "usage/project-alpha/job-generate/image-billing-confirmation.json",
        },
      }),
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

  test("does not require image billing confirmation for text usage on a generate stage", () => {
    // Given
    const stages = [
      stage("generate", {
        providerKind: "codex",
        providerUsageProvided: true,
        usage: { inputTokens: 1_000, outputTokens: 250 },
      }),
    ];

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result).toEqual({ kind: "ready" });
  });

  test("blocks Codex image usage confirmation backed only by a developer-local path", () => {
    // Given
    const stages = [
      stage("generate", {
        providerKind: "openaiImage",
        usage: { imageCount: 1 },
        imageBillingDisclosure: {
          apiKeyRequired: false,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath: "/Users/jake/chatgppt/manual-qa/image-billing.json",
        },
      }),
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

  test("blocks Codex image usage confirmation backed by a Windows local path", () => {
    // Given
    const stages = [
      stage("generate", {
        providerKind: "openaiImage",
        usage: { imageCount: 1 },
        imageBillingDisclosure: {
          apiKeyRequired: false,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath: "C:\\Users\\jake\\manual-qa\\image-billing.json",
        },
      }),
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

  test("blocks incomplete provider-specific usage payloads", () => {
    // Given
    const stages = [
      stage("plan", {
        providerUsageProvided: true,
        usage: { inputTokens: 1_000 },
      }),
      stage("generate", {
        jobId: "job-generate",
        providerKind: "openaiImage",
        providerUsageProvided: true,
        usage: {
          estimatedCostUsd: 0.2,
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

    // When
    const result = evaluateLiveUsageSummary(stages);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "incomplete_text_token_usage",
      "missing_image_usage_count",
    ]);
  });

  test("blocks estimated provider costs labelled as actual charges", () => {
    // Given
    const stages = [
      stage("generate", {
        jobId: "job-generate",
        providerKind: "openaiImage",
        usage: { imageCount: 5, estimatedCostUsd: 0.2 },
        costLabel: "actual",
        imageBillingDisclosure: {
          apiKeyRequired: false,
          userConfirmed: true,
          label: "Codex image usage confirmed",
          confirmationEvidencePath:
            "usage/project-alpha/job-generate/image-billing-confirmation.json",
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
});

function completeStages(): readonly LiveUsageStageSummary[] {
  return [
    stage("research"),
    stage("plan", { usage: { inputTokens: 1_000, outputTokens: 500 } }),
    stage("generate", {
      jobId: "job-generate",
      providerKind: "openaiImage",
      durationMs: 1_200,
      retryCount: 1,
      usage: {
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
