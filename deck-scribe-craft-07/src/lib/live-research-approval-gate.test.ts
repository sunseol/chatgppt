import { describe, expect, test } from "bun:test";
import {
  createLiveResearchDeckPlanInput,
  evaluateLiveResearchApprovalGate,
} from "./live-research-approval-gate";
import type { LiveResearchEvidenceReference } from "./live-research-evidence";
import { createProviderArtifactProvenance } from "./provider-provenance";
import type { ResearchPack } from "./research-types";

describe("live research approval gate", () => {
  test("blocks approval when live provider provenance is missing", () => {
    // Given
    const pack = researchPack();

    // When
    const gate = evaluateLiveResearchApprovalGate({
      pack,
      evidenceRefs: validEvidenceRefs(),
      provenanceLineage: [],
    });

    // Then
    expect(gate.kind).toBe("blocked");
    if (gate.kind !== "blocked") return;
    expect(gate.issues.map((issue) => issue.code)).toEqual(["missing_provenance"]);
  });

  test("blocks approval when a claim has no original source evidence", () => {
    // Given
    const pack = researchPack();

    // When
    const gate = evaluateLiveResearchApprovalGate({
      pack,
      evidenceRefs: [],
      provenanceLineage: [liveResearchProvenance()],
    });

    // Then
    expect(gate.kind).toBe("blocked");
    if (gate.kind !== "blocked") return;
    expect(gate.issues.map((issue) => issue.code)).toEqual(["summary_without_original"]);
  });

  test("allows approval when evidence and provenance are complete", () => {
    // Given
    const pack = researchPack();

    // When
    const gate = evaluateLiveResearchApprovalGate({
      pack,
      evidenceRefs: validEvidenceRefs(),
      provenanceLineage: [liveResearchProvenance()],
    });

    // Then
    expect(gate).toEqual({ kind: "ready" });
  });

  test("blocks approval when a reviewed source lacks live capture provenance", () => {
    // Given
    const pack = researchPack({
      sources: researchPack().sources.map((source) => ({ ...source, capture: undefined })),
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
    const sourceIssue = gate.issues.find((issue) => issue.code === "source_missing_live_capture");
    expect(sourceIssue).toEqual({
      code: "source_missing_live_capture",
      sourceId: "src_001",
      message: "Research source src_001 requires live capture metadata before approval.",
    });
  });

  test("blocks approval while reinforcement requests are pending", () => {
    // Given
    const pack = researchPack({
      review: {
        sourceDecisions: [],
        reinforcementRequests: [
          {
            id: "reinforce_1",
            prompt: "정부 원자료로 보강",
            status: "pending",
            requestedAt: 1_789_500_010,
          },
        ],
      },
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
    expect(gate.issues).toEqual([
      {
        code: "pending_reinforcement_request",
        message:
          "Pending research reinforcement request must be resolved before approval: 정부 원자료로 보강",
        requestId: "reinforce_1",
      },
    ]);
  });

  test("passes only an approved Research Pack hash to the deck plan live input", () => {
    // Given
    const pack = researchPack({ approvedHash: "sha256:approved_research" });

    // When
    const deckPlanInput = createLiveResearchDeckPlanInput(pack);

    // Then
    expect(deckPlanInput).toEqual({
      researchPackId: "research_live_review",
      approvedResearchPackHash: "sha256:approved_research",
    });
    expect(createLiveResearchDeckPlanInput(researchPack())).toBe(undefined);
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
      quoteSpan: {
        start: 18,
        end: 22,
        text: "67%",
      },
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
    durationMs: 2400,
    inputArtifactIds: ["source_capture_bundle_001"],
    turnId: "turn_research_001",
    threadId: "thread_project_001",
    fixture: false,
  });
}

function researchPack(overrides: Partial<ResearchPack> = {}): ResearchPack {
  return {
    id: "research_live_review",
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
      summary: "Valid live research review fixture",
      generatedAt: 1_789_400_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    ...overrides,
  };
}
