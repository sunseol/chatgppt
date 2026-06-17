import { describe, expect, test } from "bun:test";
import { buildDeckPlanPrompt } from "./deck-plan-prompt";
import type { InterviewBrief, ResearchPack } from "./deck-types";

describe("deck plan prompt", () => {
  test("creates a snapshot-stable prompt package", () => {
    const result = buildDeckPlanPrompt({ brief: briefFixture(8), research: researchFixture() });

    expect(result.prompt.includes("# Deck Plan Generation Package")).toBe(true);
    expect(result.prompt.includes("Slide count: 8")).toBe(true);
    expect(
      result.prompt.includes(
        "Each slide MUST include: role, core message, visual direction, evidence, editable elements.",
      ),
    ).toBe(true);
    expect(
      result.prompt.includes(
        "claim_001 | src_001 | dataset_001 | 국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      ),
    ).toBe(true);
    expect(result.usableClaims.map((claim) => claim.id)).toEqual(["claim_001"]);
  });

  test("excludes unsupported factual claims", () => {
    const research = researchFixture({
      claims: [
        ...researchFixture().claims,
        {
          ...researchFixture().claims[0],
          id: "claim_bad",
          statement: "출처 없는 사실 주장은 제외되어야 한다.",
          sourceIds: [],
          datasetIds: [],
          status: "supported",
          confidence: "high",
        },
      ],
    });

    const result = buildDeckPlanPrompt({ brief: briefFixture(8), research });

    expect(result.prompt.includes("출처 없는 사실 주장은 제외되어야 한다.")).toBe(false);
    expect(result.excludedClaims.map((claim) => claim.id)).toEqual(["claim_bad"]);
  });

  test("supports 5 and 12 slide bounds", () => {
    expect(
      buildDeckPlanPrompt({ brief: briefFixture(2), research: researchFixture() }).slideCount,
    ).toBe(5);
    expect(
      buildDeckPlanPrompt({ brief: briefFixture(99), research: researchFixture() }).slideCount,
    ).toBe(12);
  });
});

function briefFixture(slideCount: number): InterviewBrief {
  return {
    id: "brief_001",
    goal: "투자 유치 피치덱",
    audience: "초기 VC",
    desiredOutcome: "후속 미팅 확보",
    slideCount,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["전문적", "근거 중심"],
    mustInclude: ["문제", "시장", "솔루션"],
    mustAvoid: ["출처 없는 통계"],
    successCriteria: ["핵심 메시지가 한 문장으로 기억됨"],
    openQuestions: [],
    approvedHash: "sha256:brief",
  };
}

function researchFixture(overrides: Partial<ResearchPack> = {}): ResearchPack {
  return {
    id: "research_001",
    sources: [
      {
        id: "src_001",
        title: "Official AI adoption report",
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
        statement: "국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
        sourceIds: ["src_001"],
        datasetIds: ["dataset_001"],
        confidence: "high",
        hasNumber: true,
        needsUserReview: false,
        status: "supported",
        slideCandidates: [2],
        numericEvidence: [
          {
            id: "num_001",
            value: "67",
            unit: "%",
            baseYear: 2025,
            geography: "KR",
            definition: "국내 기업 AI 도구 시범 도입 비율",
            sourceId: "src_001",
            datasetId: "dataset_001",
          },
        ],
      },
    ],
    datasets: [
      {
        id: "dataset_001",
        title: "AI adoption",
        sourceIds: ["src_001"],
        unit: "%",
        period: "2025",
        geography: "KR",
        definition: "국내 기업 AI 도구 시범 도입 비율",
        rows: [{ label: "2025", value: 67, year: 2025 }],
        uncertain: false,
      },
    ],
    charts: [],
    factCheckReport: {
      summary: "Valid fixture",
      generatedAt: 1_789_500_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    ...overrides,
  };
}
