import { describe, expect, test } from "bun:test";
import { validateResearchPack } from "./research-validator";
import type { ResearchPack } from "./research-types";

describe("research validator", () => {
  test("accepts a valid sourced research pack", () => {
    const report = validateResearchPack(validPack());

    expect(report.valid).toBe(true);
    expect(report.fatalIssues.length).toBe(0);
  });

  test("fails source-less factual claims", () => {
    const pack = validPack({
      claims: [
        {
          ...validPack().claims[0],
          sourceIds: [],
          datasetIds: [],
          confidence: "high",
          status: "supported",
        },
      ],
    });

    const report = validateResearchPack(pack);

    expect(report.valid).toBe(false);
    expect(report.fatalIssues[0].code).toBe("missing_evidence");
  });

  test("requires labels for assumptions", () => {
    const pack = validPack({
      claims: [
        {
          ...validPack().claims[0],
          confidence: "assumption",
          status: "assumption",
          needsUserReview: false,
        },
      ],
    });

    const report = validateResearchPack(pack);

    expect(report.issues[0].code).toBe("label_required");
    expect(report.issues[0].severity).toBe("warning");
  });

  test("treats malformed major numbers as fatal", () => {
    const pack = validPack({
      claims: [
        {
          ...validPack().claims[0],
          hasNumber: true,
          numericEvidence: [
            {
              id: "num_bad",
              value: "67",
              unit: "",
              baseYear: 0,
              geography: "",
              definition: "",
              sourceId: "src_001",
              datasetId: "dataset_001",
            },
          ],
        },
      ],
    });

    const report = validateResearchPack(pack);

    expect(report.valid).toBe(false);
    expect(report.fatalIssues[0].code).toBe("major_number_metadata");
  });

  test("flags weak source grades for major claims", () => {
    const pack = validPack({
      sources: [{ ...validPack().sources[0], id: "src_weak", grade: "C", usePolicy: "supporting" }],
      claims: [{ ...validPack().claims[0], sourceIds: ["src_weak"], datasetIds: [] }],
      datasets: [],
      charts: [],
    });

    const report = validateResearchPack(pack);

    expect(report.valid).toBe(false);
    expect(report.fatalIssues[0].code).toBe("weak_source_grade");
  });
});

function validPack(overrides: Partial<ResearchPack> = {}): ResearchPack {
  return {
    id: "research_valid",
    sources: [
      {
        id: "src_001",
        title: "Official report",
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
        slideCandidates: [1],
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
      generatedAt: 1_789_400_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    ...overrides,
  };
}
