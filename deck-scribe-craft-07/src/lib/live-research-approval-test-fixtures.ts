import type { ResearchPack } from "./research-types";

export function liveApprovedResearchPackFixture(
  overrides: Partial<ResearchPack> = {},
): ResearchPack {
  return {
    id: "research_live_desktop",
    sources: [
      {
        id: "src_001",
        title: "Official adoption source",
        publisher: "Statistics Office",
        year: 2026,
        grade: "A",
        sourceType: "government",
        usePolicy: "priority",
        url: "https://example.gov/report",
        capture: {
          originalUrl: "https://example.gov/report",
          finalUrl: "https://example.gov/report?download=1",
          fetchedAt: 1_789_300_001,
          mimeType: "text/html",
          statusCode: 200,
          contentHash: "sha256:source-content",
          rawArchivePath: "docs/live-source-capture-bundle/html_001/original.html",
          textArchivePath: "docs/live-source-capture-bundle/html_001/extracted.txt",
          extractedTextHash: "sha256:source-text",
          version: 1,
        },
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
        numericEvidence: [],
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
    approvedHash: "sha256:research-live-desktop",
    factCheckReport: {
      summary: "Ready for planning.",
      generatedAt: 1_789_300_010,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
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
    provenanceLineage: [
      {
        artifactId: "research_live_desktop",
        executionMode: "production",
        providerKind: "codex",
        authMode: "codex_session",
        modelOrRuntime: "codex app-server --stdio",
        promptVersion: "live_research_pack@v1",
        durationMs: 2_200,
        inputArtifactIds: ["source_capture_bundle_001"],
        fixture: false,
        turnId: "turn_research_001",
        threadId: "thread_project_001",
      },
    ],
    ...overrides,
  };
}
