import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionWorkflowStage } from "@/components/deck/ProductionWorkflowStage";
import type { DeckProject, ResearchPack } from "@/lib/deck-types";

describe("production workflow stage", () => {
  test("shows persisted live research evidence and approval blockers when research exists", () => {
    // Given
    const project = projectFixture({ research: researchPack() });

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="research" />,
    );

    // Then
    expect(markup.includes("Live research approval gate")).toBe(true);
    expect(markup.includes("https://example.gov/report")).toBe(true);
    expect(markup.includes("fetched_at 1789300001")).toBe(true);
    expect(markup.includes("sha256:source-content")).toBe(true);
    expect(markup.includes("missing_provenance")).toBe(true);
    expect(markup.includes("summary_without_original")).toBe(true);
  });

  test("shows source exclusion and reinforcement controls on production research review", () => {
    // Given
    const project = projectFixture({ research: researchPack() });

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="research" />,
    );

    // Then
    expect(markup.includes("출처 제외")).toBe(true);
    expect(markup.includes("보강 요청")).toBe(true);
    expect(markup.includes("보강 요청 반영")).toBe(true);
  });

  test("shows pending reinforcement blockers from persisted review state", () => {
    // Given
    const project = projectFixture({
      research: {
        ...researchPack(),
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
      },
    });

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="research" />,
    );

    // Then
    expect(markup.includes("pending_reinforcement_request")).toBe(true);
    expect(markup.includes("정부 원자료로 보강")).toBe(true);
  });

  test("uses persisted live evidence refs and provenance lineage for approval", () => {
    // Given
    const project = projectFixture({ research: approvedReadyResearchPack() });

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="research" />,
    );

    // Then
    expect(markup.includes("Live evidence and provenance are ready for approval.")).toBe(true);
    expect(markup.includes("government")).toBe(true);
    expect(markup.includes("high")).toBe(true);
    expect(markup.includes("quote 0-3")).toBe(true);
    expect(markup.includes("67%")).toBe(true);
    expect(markup.includes("Live Research Pack 승인")).toBe(true);
    expect(researchApprovalButtonMarkup(markup).includes(' disabled=""')).toBe(false);
    expect(markup.includes("missing_provenance")).toBe(false);
    expect(markup.includes("summary_without_original")).toBe(false);
  });

  test("shows research live-network policy and production mock fallback blocking", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="research" />,
    );

    // Then
    expect(markup.includes("Live research network policy")).toBe(true);
    expect(markup.includes("Live web search is scoped to the Research step.")).toBe(true);
    expect(markup.includes("untrusted_source_content")).toBe(true);
    expect(markup.includes("GET/HEAD")).toBe(true);
    expect(markup.includes("mock_research_fallback_forbidden")).toBe(true);
    expect(
      markup.includes("Production research failures must not be replaced with mock sources."),
    ).toBe(true);
  });

  test("describes production image generation through Codex OAuth", () => {
    // Given
    const project = projectFixture();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="generate" />,
    );

    // Then
    expect(
      markup.includes("Production job은 Codex OAuth 이미지 capability 확인 후에만 시작됩니다."),
    ).toBe(true);
    expect(markup.includes("OpenAI Image provider")).toBe(false);
  });
});

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_live_research",
    name: "Live Research Project",
    initialPrompt: "시장 조사 덱",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "RESEARCH_APPROVAL_PENDING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function researchApprovalButtonMarkup(markup: string): string {
  const labelIndex = markup.indexOf("Live Research Pack 승인");
  const buttonStart = markup.lastIndexOf("<button", labelIndex);
  const buttonEnd = markup.indexOf("</button>", labelIndex);
  return markup.slice(buttonStart, buttonEnd);
}

function researchPack(): ResearchPack {
  return {
    id: "research_live",
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
      summary: "Live source needs evidence refs before approval.",
      generatedAt: 1_789_300_010,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
  };
}

function approvedReadyResearchPack(): ResearchPack {
  return {
    ...researchPack(),
    liveEvidenceRefs: [
      {
        id: "ev_001",
        claimId: "claim_001",
        sourceId: "src_001",
        sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
        kind: "quote_span",
        quoteSpan: {
          start: 0,
          end: 3,
          text: "67%",
        },
        datasetId: "dataset_001",
      },
    ],
    provenanceLineage: [
      {
        artifactId: "research_live",
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
  };
}
