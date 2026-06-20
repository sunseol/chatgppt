import { describe, expect, test } from "bun:test";
import {
  validateLiveResearchEvidence,
  type LiveResearchEvidenceReference,
} from "./live-research-evidence";
import type { ResearchPack } from "./research-types";

describe("live research evidence reference targets", () => {
  test("rejects persisted evidence refs for unknown claims", () => {
    // Given
    const pack = researchPack();
    const evidenceRefs: LiveResearchEvidenceReference[] = [
      quoteEvidenceRef("ev_001", "claim_001"),
      quoteEvidenceRef("ev_stale_claim", "claim_removed"),
    ];

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs });

    // Then
    expect(report.valid).toBe(false);
    expect(report.fatalIssues).toEqual([
      {
        code: "unknown_reference",
        severity: "fatal",
        claimId: "claim_removed",
        message: "Unknown evidence claim: claim_removed",
      },
    ]);
  });

  test("rejects duplicate persisted evidence ref ids", () => {
    // Given
    const pack = researchPack();
    const evidenceRefs: LiveResearchEvidenceReference[] = [
      quoteEvidenceRef("ev_duplicate", "claim_001"),
      quoteEvidenceRef("ev_duplicate", "claim_001"),
    ];

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs });

    // Then
    expect(report.valid).toBe(false);
    expect(report.fatalIssues).toEqual([
      {
        code: "duplicate_evidence_reference",
        severity: "fatal",
        message: "Duplicate evidence reference id: ev_duplicate",
      },
    ]);
  });

  test("rejects evidence refs with non-canonical persisted ids", () => {
    // Given
    const pack = researchPack();
    const evidenceRefs: LiveResearchEvidenceReference[] = [
      quoteEvidenceRef(" ev_001 ", "claim_001"),
    ];

    // When
    const report = validateLiveResearchEvidence({ pack, evidenceRefs });

    // Then
    expect(report.valid).toBe(false);
    expect(
      report.fatalIssues.map((issue) => issue.code).includes("noncanonical_evidence_reference"),
    ).toBe(true);
  });
});

function quoteEvidenceRef(id: string, claimId: string): LiveResearchEvidenceReference {
  return {
    id,
    claimId,
    sourceId: "src_001",
    sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
    kind: "quote_span",
    quoteSpan: {
      start: 18,
      end: 22,
      text: "67%",
    },
    datasetId: "dataset_001",
  };
}

function researchPack(): ResearchPack {
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
