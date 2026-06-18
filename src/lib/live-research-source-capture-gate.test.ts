import { describe, expect, test } from "bun:test";
import { evaluateLiveResearchApprovalGate } from "./live-research-approval-gate";
import type { LiveResearchEvidenceReference } from "./live-research-evidence";
import { createProviderArtifactProvenance } from "./provider-provenance";
import type { ResearchPack, Source } from "./research-types";

describe("live research source capture approval gate", () => {
  test("blocks approval when capture metadata exists but is incomplete", () => {
    // Given
    const pack = researchPack({
      sources: [
        {
          ...source(),
          capture: {
            originalUrl: "not-a-url",
            finalUrl: "",
            fetchedAt: 0,
            mimeType: "",
            statusCode: 500,
            contentHash: "sha256:",
            rawArchivePath: "",
            textArchivePath: "",
            extractedTextHash: "sha256:",
            version: 0,
          },
        },
      ],
    });

    // When
    const gate = evaluateLiveResearchApprovalGate({
      pack,
      evidenceRefs: validEvidenceRefs(),
      provenanceLineage: [liveResearchProvenance()],
    });

    // Then
    expect(gate.kind).toBe("blocked");
    if (gate.kind !== "blocked") return;
    expect(gate.issues.map((issue) => issue.code)).toEqual(["source_capture_incomplete"]);
    expect(gate.issues[0]?.sourceId).toBe("src_001");
  });
});

function validEvidenceRefs(): LiveResearchEvidenceReference[] {
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

function liveResearchProvenance() {
  return createProviderArtifactProvenance({
    artifactId: "research_live_review",
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.139.0",
    promptVersion: "live_research_pack@v1",
    durationMs: 2_400,
    inputArtifactIds: ["source_capture_bundle_001"],
    turnId: "turn_research_001",
    threadId: "thread_project_001",
    fixture: false,
  });
}

function researchPack(overrides: Partial<ResearchPack> = {}): ResearchPack {
  return {
    id: "research_live_review",
    sources: [source()],
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
    factCheckReport: {
      summary: "Valid live research review fixture",
      generatedAt: 1_789_400_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    ...overrides,
  };
}

function source(): Source {
  return {
    id: "src_001",
    title: "Official source artifact",
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
  };
}
