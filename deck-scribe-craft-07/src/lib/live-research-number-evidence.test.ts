import { describe, expect, test } from "bun:test";
import {
  validateLiveResearchEvidence,
  type LiveResearchEvidenceReference,
} from "./live-research-evidence";
import type { ResearchPack } from "./research-types";

describe("live research number evidence", () => {
  test("requires dataset metadata when a major-number claim relies on a dataset", () => {
    // Given
    const pack = researchPack({
      claims: [{ ...researchPack().claims[0], numericEvidence: [] }],
      datasets: [
        {
          ...researchPack().datasets[0],
          unit: "",
          period: "",
          geography: "",
          definition: "",
        },
      ],
    });

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs: evidenceRefs() });

    // Then
    expect(report.valid).toBe(false);
    expect(report.fatalIssues.map((issue) => issue.code)).toEqual(["major_number_metadata"]);
    expect(report.fatalIssues[0]?.datasetId).toBe("dataset_001");
  });

  test("rejects numeric evidence that points outside the claim lineage", () => {
    // Given
    const base = researchPack();
    const pack = researchPack({
      sources: [...base.sources, { ...base.sources[0], id: "src_002", title: "Unlinked source" }],
      datasets: [
        ...base.datasets,
        { ...base.datasets[0], id: "dataset_002", sourceIds: ["src_002"] },
      ],
      claims: [
        {
          ...base.claims[0],
          numericEvidence: [
            {
              ...base.claims[0].numericEvidence[0],
              sourceId: "src_002",
              datasetId: "dataset_002",
            },
          ],
        },
      ],
    });

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs: evidenceRefs() });

    // Then
    expect(report.valid).toBe(false);
    expect(report.fatalIssues.map((issue) => issue.code)).toEqual([
      "unknown_reference",
      "unknown_reference",
    ]);
    expect(report.fatalIssues.map((issue) => issue.sourceId).filter(Boolean)).toEqual(["src_002"]);
    expect(report.fatalIssues.map((issue) => issue.datasetId).filter(Boolean)).toEqual([
      "dataset_002",
    ]);
  });
});

function evidenceRefs(): readonly LiveResearchEvidenceReference[] {
  return [
    {
      id: "ev_001",
      claimId: "claim_001",
      sourceId: "src_001",
      sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
      kind: "quote_span",
      quoteSpan: { start: 18, end: 22, text: "67%" },
      datasetId: "dataset_001",
    },
  ];
}

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
        capture: sourceCapture(),
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

function sourceCapture() {
  return {
    originalUrl: "https://example.gov/report",
    finalUrl: "https://example.gov/report",
    fetchedAt: 1_789_400_000,
    mimeType: "text/html",
    statusCode: 200,
    contentHash: "sha256:source-content",
    rawArchivePath: "docs/live-source-capture-bundle/html_001/original.html",
    textArchivePath: "docs/live-source-capture-bundle/html_001/extracted.txt",
    extractedTextHash: "sha256:source-text",
    version: 1,
  };
}
