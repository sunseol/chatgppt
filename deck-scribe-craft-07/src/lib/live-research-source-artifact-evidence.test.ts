import { describe, expect, test } from "bun:test";
import {
  validateLiveResearchEvidence,
  type LiveResearchEvidenceReference,
} from "./live-research-evidence";
import type { ResearchPack } from "./research-types";

describe("live research source artifact evidence", () => {
  test("rejects evidence refs when the linked source lacks captured artifact metadata", () => {
    // Given
    const pack = researchPackWithoutCapture();
    const evidenceRefs: LiveResearchEvidenceReference[] = [
      {
        id: "ev_001",
        claimId: "claim_001",
        sourceId: "src_001",
        sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
        kind: "quote_span",
        quoteSpan: {
          start: 10,
          end: 18,
          text: "67%",
        },
        datasetId: "dataset_001",
      },
    ];

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs });

    // Then
    expect(report.valid).toBe(false);
    expect(report.fatalIssues.map((issue) => issue.code).includes("missing_source_artifact")).toBe(
      true,
    );
  });
});

function researchPackWithoutCapture(): ResearchPack {
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
      summary: "Invalid live research evidence fixture",
      generatedAt: 1_789_400_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
  };
}
