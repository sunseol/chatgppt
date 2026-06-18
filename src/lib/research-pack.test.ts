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

  test("preserves live source capture metadata on parsed sources", () => {
    const parsed = parseResearchPack({
      ...validPack,
      sources: [
        {
          ...validPack.sources[0],
          capture: {
            originalUrl: "https://example.gov/ev",
            finalUrl: "https://example.gov/ev?download=1",
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
    });

    expect(parsed.sources[0].capture?.finalUrl).toBe("https://example.gov/ev?download=1");
    expect(parsed.sources[0].capture?.contentHash).toBe("sha256:source-content");
    expect(parsed.sources[0].capture?.version).toBe(1);
  });

  test("preserves source decisions and reinforcement requests", () => {
    const parsed = parseResearchPack({
      ...validPack,
      review: {
        sourceDecisions: [
          {
            sourceId: "src_001",
            decision: "excluded",
            reason: "source is not official enough",
            decidedAt: 1_789_500_000,
          },
        ],
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

    expect(parsed.review?.sourceDecisions[0]?.decision).toBe("excluded");
    expect(parsed.review?.reinforcementRequests[0]?.status).toBe("pending");
    expect(parsed.review?.reinforcementRequests[0]?.prompt).toBe("정부 원자료로 보강");
  });

  test("preserves live evidence references and provider provenance lineage", () => {
    const parsed = parseResearchPack({
      ...validPack,
      liveEvidenceRefs: [
        {
          id: "ev_001",
          claimId: "claim_001",
          sourceId: "src_001",
          sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
          kind: "quote_span",
          quoteSpan: {
            start: 0,
            end: 4,
            text: "12.4",
          },
          datasetId: "dataset_001",
        },
      ],
      provenanceLineage: [
        {
          artifactId: "research_001",
          executionMode: "production",
          providerKind: "codex",
          authMode: "codex_session",
          modelOrRuntime: "codex-cli 0.139.0",
          promptVersion: "live_research_pack@v1",
          durationMs: 2200,
          inputArtifactIds: ["source_capture_bundle_001"],
          fixture: false,
          turnId: "turn_research_001",
          threadId: "thread_project_001",
        },
      ],
    });

    expect(parsed.liveEvidenceRefs?.[0]?.id).toBe("ev_001");
    expect(parsed.liveEvidenceRefs?.[0]?.sourceArtifactPath).toBe(
      "docs/live-source-capture-bundle/html_001/original.html",
    );
    expect(parsed.provenanceLineage?.[0]?.turnId).toBe("turn_research_001");
    expect(parsed.provenanceLineage?.[0]?.fixture).toBe(false);
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
