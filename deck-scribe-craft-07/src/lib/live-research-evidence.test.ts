import { describe, expect, test } from "bun:test";
import {
  getDeckPlanEligibleClaims,
  validateLiveResearchEvidence,
  type LiveResearchEvidenceReference,
} from "./live-research-evidence";
import type { ResearchPack } from "./research-types";

describe("live research evidence validation", () => {
  test("accepts claims backed by a source artifact quote span and numeric dataset", () => {
    // Given
    const pack = researchPack();
    const evidenceRefs: LiveResearchEvidenceReference[] = [
      {
        id: "ev_001",
        claimId: "claim_001",
        sourceId: "src_001",
        sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
        kind: "quote_span",
        quoteSpan: {
          start: 18,
          end: 22,
          text: "67%",
        },
        datasetId: "dataset_001",
      },
    ];

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs });

    // Then
    expect(report.valid).toBe(true);
    expect(report.fatalIssues).toEqual([]);
    expect(getDeckPlanEligibleClaims(pack, report).map((claim) => claim.id)).toEqual(["claim_001"]);
  });

  test("rejects search-summary-only claims without an original quote or table reference", () => {
    // Given
    const pack = researchPack({
      datasets: [],
      charts: [],
      claims: [
        {
          ...researchPack().claims[0],
          datasetIds: [],
          hasNumber: false,
          numericEvidence: [],
        },
      ],
    });

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs: [] });

    // Then
    expect(report.valid).toBe(false);
    expect(report.fatalIssues.map((issue) => issue.code).includes("summary_without_original")).toBe(
      true,
    );
    expect(getDeckPlanEligibleClaims(pack, report)).toEqual([]);
  });

  test("requires major number metadata and a dataset or numeric evidence reference", () => {
    // Given
    const pack = researchPack({
      datasets: [],
      charts: [],
      claims: [
        {
          ...researchPack().claims[0],
          datasetIds: [],
          numericEvidence: [
            {
              id: "num_001",
              value: "67",
              unit: "",
              baseYear: 0,
              geography: "",
              definition: "",
              sourceId: "src_001",
            },
          ],
        },
      ],
    });
    const evidenceRefs: LiveResearchEvidenceReference[] = [
      {
        id: "ev_001",
        claimId: "claim_001",
        sourceId: "src_001",
        sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
        kind: "quote_span",
        quoteSpan: {
          start: 18,
          end: 22,
          text: "67%",
        },
      },
    ];

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs });

    // Then
    expect(report.valid).toBe(false);
    const fatalCodes = report.fatalIssues.map((issue) => issue.code);
    expect(fatalCodes.includes("major_number_metadata")).toBe(true);
    expect(fatalCodes.includes("missing_number_dataset")).toBe(true);
  });

  test("requires at least one real dataset or numeric evidence item in the Research Pack", () => {
    // Given
    const pack = researchPack({
      datasets: [],
      charts: [],
      claims: [
        {
          ...researchPack().claims[0],
          statement: "The captured source describes the market trend without a numeric dataset.",
          datasetIds: [],
          hasNumber: false,
          numericEvidence: [],
        },
      ],
    });
    const evidenceRefs: LiveResearchEvidenceReference[] = [
      {
        id: "ev_001",
        claimId: "claim_001",
        sourceId: "src_001",
        sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
        kind: "quote_span",
        quoteSpan: {
          start: 10,
          end: 42,
          text: "market trend without numeric dataset",
        },
      },
    ];

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs });

    // Then
    expect(report.valid).toBe(false);
    expect(report.fatalIssues.map((issue) => issue.code)).toEqual([
      "missing_dataset_or_numeric_evidence",
    ]);
  });

  test("accepts table references as claim-to-source evidence", () => {
    // Given
    const pack = researchPack({
      claims: [
        {
          ...researchPack().claims[0],
          statement: "The benchmark table reports the 2025 adoption rate.",
        },
      ],
    });
    const evidenceRefs: LiveResearchEvidenceReference[] = [
      {
        id: "ev_table_001",
        claimId: "claim_001",
        sourceId: "src_001",
        sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
        kind: "table_reference",
        tableRef: {
          tableId: "table_001",
          rowKey: "2025",
          columnKey: "adoption_rate",
        },
        datasetId: "dataset_001",
      },
    ];

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs });

    // Then
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
  });
});

function researchPack(overrides: Partial<ResearchPack> = {}): ResearchPack {
  return {
    id: "research_live_pack",
    sources: [
      {
        id: "src_001",
        title: "Official source artifact",
        publisher: "Statistics Office",
        year: 2026,
        grade: "A",
        sourceType: "government",
        usePolicy: "priority",
        url: "https://example.gov/report",
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
      summary: "Valid live research evidence fixture",
      generatedAt: 1_789_400_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    ...overrides,
  };
}
