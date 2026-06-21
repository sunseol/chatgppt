import { describe, expect, test } from "bun:test";
import { evaluateLiveUsageSummary, type LiveUsageStageSummary } from "./live-usage-summary";

describe("live usage summary stage identity", () => {
  test("blocks usage summary stages without a displayable stage id", () => {
    // Given: a runtime payload has provider and timing data but no usable stage identity.
    const stages = [
      runtimeStage({
        stageId: " ",
        providerKind: "codex",
        durationMs: 800,
        retryCount: 0,
        providerUsageProvided: false,
        costLabel: "hidden",
      }),
    ];

    // When / Then: the summary cannot pass without a stage row identity.
    const result = evaluateLiveUsageSummary(stages);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_usage_stage_identity"]);
  });

  test("blocks usage summary stages with unsupported runtime provider kinds", () => {
    // Given: a runtime payload reports a provider outside the DeckForge provider taxonomy.
    const stages = [
      runtimeStage({
        stageId: "research",
        providerKind: "fixture",
        durationMs: 800,
        retryCount: 0,
        providerUsageProvided: false,
        costLabel: "hidden",
      }),
    ];

    // When / Then: unsupported provider values cannot be displayed as Live provider evidence.
    const result = evaluateLiveUsageSummary(stages);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_usage_provider_kind"]);
    expect(result.issues[0]?.stageId).toBe("research");
  });

  test("blocks duplicate usage summary stage ids", () => {
    // Given: a runtime payload repeats one stage row with separate duration and usage evidence.
    const stages = [
      runtimeStage({
        stageId: "generate",
        jobId: "job-generate",
        providerKind: "openaiImage",
        durationMs: 1200,
        retryCount: 0,
        providerUsageProvided: true,
        usage: { imageCount: 1 },
        costLabel: "hidden",
        imageBillingDisclosure: confirmedBillingDisclosure(),
      }),
      runtimeStage({
        stageId: "generate",
        jobId: "job-generate",
        providerKind: "openaiImage",
        durationMs: 1400,
        retryCount: 1,
        providerUsageProvided: true,
        usage: { imageCount: 1 },
        costLabel: "hidden",
        imageBillingDisclosure: confirmedBillingDisclosure(),
      }),
    ];

    // When / Then: duplicate stage rows cannot inflate usage-summary evidence.
    const result = evaluateLiveUsageSummary(stages);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_usage_stage_identity"]);
    expect(result.issues[0]?.stageId).toBe("generate");
  });

  test("blocks usage summary stage ids that only become canonical after trimming", () => {
    // Given: a runtime payload pads the generate stage id so exact image-stage checks miss it.
    const stages = [
      runtimeStage({
        stageId: " generate ",
        providerKind: "codex",
        durationMs: 800,
        retryCount: 0,
        providerUsageProvided: false,
        costLabel: "hidden",
      }),
    ];

    // When / Then: trim-only stage identity cannot satisfy DF-244 usage evidence.
    const result = evaluateLiveUsageSummary(stages);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["noncanonical_usage_stage_identity"]);
    expect(result.issues[0]?.stageId).toBe("generate");
  });
});

function runtimeStage(value: object): LiveUsageStageSummary {
  return JSON.parse(JSON.stringify(value));
}

function confirmedBillingDisclosure(): NonNullable<
  LiveUsageStageSummary["imageBillingDisclosure"]
> {
  return {
    apiKeyRequired: false,
    userConfirmed: true,
    label: "Codex image usage confirmed",
    confirmationEvidencePath: "usage/project-alpha/job-generate/image-billing-confirmation.json",
  };
}
