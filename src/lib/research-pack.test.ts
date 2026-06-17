import { describe, expect, test } from "bun:test";
import { createApprovedResearchPackArtifact, parseResearchPack } from "./research-pack";
import type { ResearchPack } from "./deck-types";

const validPack: ResearchPack = {
  id: "research_001",
  sources: [
    {
      id: "src_001",
      title: "Korea EV Registration Statistics",
      publisher: "국토교통부",
      year: 2025,
      grade: "A",
      sourceType: "government",
      usePolicy: "priority",
      url: "https://example.gov/ev",
    },
  ],
  claims: [
    {
      id: "claim_001",
      statement: "한국 전기차 신규 등록은 2025년에 증가했다.",
      sourceIds: ["src_001"],
      datasetIds: ["dataset_001"],
      confidence: "high",
      hasNumber: true,
      needsUserReview: false,
      status: "supported",
      slideCandidates: [3, 4],
      numericEvidence: [
        {
          id: "num_001",
          value: "12.4",
          unit: "%",
          baseYear: 2025,
          geography: "KR",
          definition: "전년 대비 신규 등록 증가율",
          sourceId: "src_001",
          datasetId: "dataset_001",
        },
      ],
    },
    {
      id: "claim_002",
      statement: "정책 변화의 시장 영향은 아직 불확실하다.",
      sourceIds: ["src_001"],
      datasetIds: [],
      confidence: "low",
      hasNumber: false,
      needsUserReview: true,
      status: "uncertain",
      slideCandidates: [5],
      numericEvidence: [],
    },
  ],
  datasets: [
    {
      id: "dataset_001",
      title: "EV registrations by year",
      sourceIds: ["src_001"],
      unit: "vehicles",
      period: "2024-2025",
      geography: "KR",
      definition: "연간 신규 등록 대수",
      rows: [
        { label: "2024", value: 100_000, year: 2024 },
        { label: "2025", value: 112_400, year: 2025 },
      ],
      uncertain: false,
    },
  ],
  charts: [
    {
      id: "chart_001",
      title: "전기차 신규 등록 추이",
      chartType: "bar",
      datasetId: "dataset_001",
      unit: "vehicles",
      period: "2024-2025",
      sourceIds: ["src_001"],
      slideCandidates: [3],
      uncertain: false,
    },
  ],
  factCheckReport: {
    summary: "핵심 수치에는 정부 원자료와 기준연도가 연결되어 있다.",
    generatedAt: 1_789_000_000,
    fatalIssueCount: 0,
    issues: [],
    uncertainItems: ["정책 변화의 시장 영향은 아직 불확실하다."],
  },
};

describe("research pack schema", () => {
  test("parses a complete valid research pack", () => {
    const parsed = parseResearchPack(validPack);

    expect(parsed.sources[0].grade).toBe("A");
    expect(parsed.claims[0].confidence).toBe("high");
    expect(parsed.claims[0].datasetIds).toEqual(["dataset_001"]);
    expect(parsed.claims[0].slideCandidates).toEqual([3, 4]);
    expect(parsed.claims[0].numericEvidence[0].unit).toBe("%");
    expect(parsed.claims[0].numericEvidence[0].baseYear).toBe(2025);
    expect(parsed.claims[0].numericEvidence[0].geography).toBe("KR");
    expect(parsed.claims[0].numericEvidence[0].definition).toBe("전년 대비 신규 등록 증가율");
    expect(parsed.claims[1].status).toBe("uncertain");
    expect(parsed.factCheckReport.uncertainItems.length).toBe(1);
  });

  test("rejects major numeric claims without required number metadata", () => {
    const invalid = {
      ...validPack,
      claims: [{ ...validPack.claims[0], numericEvidence: [] }],
    };

    expect(() => parseResearchPack(invalid)).toThrow();
  });

  test("rejects unusable grade E sources", () => {
    const invalid = {
      ...validPack,
      sources: [{ ...validPack.sources[0], grade: "E" }],
    };

    expect(() => parseResearchPack(invalid)).toThrow();
  });

  test("creates an immutable approved research artifact", () => {
    const approved = createApprovedResearchPackArtifact({
      projectId: "p_research",
      pack: validPack,
      version: 2,
      approvedAt: 1_789_100_000,
    });

    expect(approved.record.id).toBe("p_research_research_v2");
    expect(approved.record.type).toBe("research");
    expect(Object.isFrozen(approved.pack)).toBe(true);
    expect(Object.isFrozen(approved.pack.sources)).toBe(true);
    expect(approved.pack.claims[1].status).toBe("uncertain");
  });
});
