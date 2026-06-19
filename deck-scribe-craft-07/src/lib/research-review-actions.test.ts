import { describe, expect, test } from "bun:test";
import {
  excludeResearchSource,
  requestResearchReinforcement,
  resolveResearchReinforcementRequest,
} from "./research-review-actions";
import type { ResearchPack } from "./research-types";

describe("research review actions", () => {
  test("records source exclusion and removes dependent research artifacts", () => {
    // Given
    const pack = researchPack({
      approvedHash: "sha256:stale_approval",
      liveEvidenceRefs: [
        {
          id: "ev_001",
          claimId: "claim_001",
          sourceId: "src_001",
          sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
          kind: "quote_span",
          quoteSpan: { start: 0, end: 3, text: "67%" },
          datasetId: "dataset_001",
        },
      ],
    });

    // When
    const next = excludeResearchSource({
      pack,
      sourceId: "src_001",
      reason: "source is not official enough",
      decidedAt: 1_789_500_000,
    });

    // Then
    expect(next.approvedHash).toBe(undefined);
    expect(next.sources.map((source) => source.id)).toEqual(["src_002"]);
    expect(next.datasets).toEqual([]);
    expect(next.charts).toEqual([]);
    expect(next.liveEvidenceRefs).toEqual([]);
    expect(next.claims[0]?.sourceIds).toEqual([]);
    expect(next.claims[0]?.datasetIds).toEqual([]);
    expect(next.claims[0]?.hasNumber).toBe(false);
    expect(next.claims[0]?.needsUserReview).toBe(true);
    expect(next.claims[0]?.status).toBe("assumption");
    expect(next.claims[0]?.confidence).toBe("assumption");
    expect(next.review?.sourceDecisions).toEqual([
      {
        sourceId: "src_001",
        decision: "excluded",
        reason: "source is not official enough",
        decidedAt: 1_789_500_000,
      },
    ]);
    expect(next.factCheckReport.uncertainItems.includes("출처 제외: src_001")).toBe(true);
  });

  test("removes numeric evidence that references a removed dataset through a retained source", () => {
    // Given
    const pack = researchPack({
      claims: [
        {
          ...researchPack().claims[0],
          sourceIds: ["src_002"],
          numericEvidence: [
            {
              id: "num_001",
              value: "67",
              unit: "%",
              baseYear: 2025,
              geography: "KR",
              definition: "AI adoption",
              sourceId: "src_002",
              datasetId: "dataset_001",
            },
          ],
        },
      ],
    });

    // When
    const next = excludeResearchSource({
      pack,
      sourceId: "src_001",
      reason: "dataset source removed",
      decidedAt: 1_789_500_020,
    });

    // Then
    expect(next.datasets).toEqual([]);
    expect(next.claims[0]?.sourceIds).toEqual(["src_002"]);
    expect(next.claims[0]?.datasetIds).toEqual([]);
    expect(next.claims[0]?.numericEvidence).toEqual([]);
    expect(next.claims[0]?.hasNumber).toBe(false);
  });

  test("tracks pending and resolved reinforcement requests", () => {
    // Given
    const pack = researchPack({ approvedHash: "sha256:stale_approval" });

    // When
    const pending = requestResearchReinforcement({
      pack,
      prompt: "정부 원자료로 보강",
      requestedAt: 1_789_500_010,
    });
    const resolved = resolveResearchReinforcementRequest({
      pack: pending,
      requestId: "reinforce_1",
      resolvedAt: 1_789_500_100,
    });

    // Then
    expect(pending.approvedHash).toBe(undefined);
    expect(pending.review?.reinforcementRequests).toEqual([
      {
        id: "reinforce_1",
        prompt: "정부 원자료로 보강",
        status: "pending",
        requestedAt: 1_789_500_010,
      },
    ]);
    expect(resolved.review?.reinforcementRequests).toEqual([
      {
        id: "reinforce_1",
        prompt: "정부 원자료로 보강",
        status: "resolved",
        requestedAt: 1_789_500_010,
        resolvedAt: 1_789_500_100,
      },
    ]);
  });
});

function researchPack(overrides: Partial<ResearchPack> = {}): ResearchPack {
  return {
    id: "research_review_actions",
    sources: [
      {
        id: "src_001",
        title: "Source to remove",
        publisher: "Industry Blog",
        year: 2026,
        grade: "B",
        sourceType: "industry",
        usePolicy: "allowed",
      },
      {
        id: "src_002",
        title: "Official source",
        publisher: "Statistics Office",
        year: 2026,
        grade: "A",
        sourceType: "government",
        usePolicy: "priority",
      },
    ],
    claims: [
      {
        id: "claim_001",
        statement: "67% adoption",
        sourceIds: ["src_001"],
        datasetIds: ["dataset_001"],
        confidence: "high",
        hasNumber: true,
        needsUserReview: false,
        status: "supported",
        slideCandidates: [1],
        numericEvidence: [
          {
            id: "num_001",
            value: "67",
            unit: "%",
            baseYear: 2025,
            geography: "KR",
            definition: "AI adoption",
            sourceId: "src_001",
            datasetId: "dataset_001",
          },
        ],
      },
    ],
    datasets: [
      {
        id: "dataset_001",
        title: "Adoption",
        sourceIds: ["src_001"],
        unit: "%",
        period: "2025",
        geography: "KR",
        definition: "AI adoption",
        rows: [{ label: "2025", value: 67, year: 2025 }],
        uncertain: false,
      },
    ],
    charts: [
      {
        id: "chart_001",
        title: "Adoption chart",
        chartType: "bar",
        datasetId: "dataset_001",
        unit: "%",
        period: "2025",
        sourceIds: ["src_001"],
        slideCandidates: [1],
        uncertain: false,
      },
    ],
    factCheckReport: {
      summary: "Review actions fixture",
      generatedAt: 1_789_500_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    ...overrides,
  };
}
