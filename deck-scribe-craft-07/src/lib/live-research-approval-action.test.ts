import { describe, expect, test } from "bun:test";
import { createLiveResearchApprovalPatch } from "./live-research-approval-action";
import type { ResearchPack } from "./research-types";

describe("live research approval action", () => {
  test("creates an approval patch and deck-plan input when the live gate is ready", () => {
    // Given
    const pack = readyResearchPack();

    // When
    const result = createLiveResearchApprovalPatch({
      pack,
      projectId: "project_live_research",
      version: 1,
      approvedAt: 1_789_300_020,
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") throw new Error("Expected live research approval to be ready.");
    expect(result.patch.stage).toBe("PLANNING");
    expect(result.patch.research.approvedHash).toBe(result.approvedHash);
    expect(result.approvalArtifact.record.id).toBe("project_live_research_research_v1");
    expect(result.approvalArtifact.record.projectId).toBe("project_live_research");
    expect(result.approvalArtifact.record.type).toBe("research");
    expect(result.approvalArtifact.record.version).toBe(1);
    expect(result.approvalArtifact.record.path).toBe(
      "projects/project_live_research/research/research.v1.json",
    );
    expect(result.approvalArtifact.record.createdAt).toBe(1_789_300_020);
    expect(result.deckPlanInput).toEqual({
      researchPackId: "research_approved",
      approvedResearchPackHash: result.approvedHash,
    });
  });

  test("returns gate blockers without approving unsafe research", () => {
    // Given
    const pack = { ...readyResearchPack(), liveEvidenceRefs: [] };

    // When
    const result = createLiveResearchApprovalPatch({
      pack,
      projectId: "project_live_research",
      version: 1,
      approvedAt: 1_789_300_020,
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") throw new Error("Expected live research approval blocker.");
    expect(result.issues.map((issue) => issue.code).includes("summary_without_original")).toBe(
      true,
    );
  });
});

function readyResearchPack(): ResearchPack {
  return {
    id: "research_approved",
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
      summary: "Ready live research pack.",
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
        artifactId: "research_approved",
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
  };
}
