import { describe, expect, test } from "bun:test";
import { runDesktopLiveResearchPackWorkflow } from "./desktop-live-research-pack-workflow";
import { createProviderJobManager } from "./provider-job-manager";
import type { DeckProject, InterviewBrief, ResearchPack } from "./deck-types";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";

describe("desktop live research pack workflow", () => {
  test("runs a network-enabled Research Pack turn and stores approval-ready evidence", async () => {
    // Given
    const networkAccessRequests: boolean[] = [];
    const runtime = structuredTurnRuntime(researchPackFixture(), networkAccessRequests);

    // When
    const result = await runDesktopLiveResearchPackWorkflow({
      project: projectFixture({ brief: briefFixture() }),
      jobManager: createProviderJobManager({ createId: () => "job_desktop_research_pack" }),
      tauriRuntime: runtime,
      createdAt: 1_789_810_000_000,
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(networkAccessRequests).toEqual([true]);
    expect(result.patch.stage).toBe("RESEARCH_APPROVAL_PENDING");
    expect(result.patch.research.sources[0]?.capture?.rawArchivePath).toBe(
      "docs/live-source-capture-bundle/src_ai_spend/original.html",
    );
    expect(result.patch.research.liveEvidenceRefs?.[0]?.claimId).toBe("claim_001");
    expect(result.patch.research.provenanceLineage?.[0]?.turnId).toBe("turn_live_research_pack");
    expect(result.summary).toBe("Stored 1 claims from 1 live sources.");
  });

  test("stores a blocked Research Pack so the frontend can show gate issues", async () => {
    // Given
    const runtime = structuredTurnRuntime(blockedResearchPackFixture(), []);

    // When
    const result = await runDesktopLiveResearchPackWorkflow({
      project: projectFixture({ brief: briefFixture() }),
      jobManager: createProviderJobManager({ createId: () => "job_desktop_research_blocked" }),
      tauriRuntime: runtime,
      createdAt: 1_789_810_000_000,
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.patch.research.sources[0]?.capture).toBe(undefined);
    expect(result.issues.map((issue) => issue.code).includes("source_missing_live_capture")).toBe(
      true,
    );
  });
});

function structuredTurnRuntime(
  payload: ResearchPack,
  networkAccessRequests: boolean[],
): DeckforgeTauriRuntime {
  return {
    core: {
      invoke: async (command, args) => {
        expect(command).toBe("deckforge_codex_app_server_structured_turn");
        const request = requestRecord(args);
        networkAccessRequests.push(request["networkAccess"] === true);
        const threadId = "thread_live_research_pack";
        const turnId = "turn_live_research_pack";
        return {
          runtime: "codex app-server",
          threadId,
          turnId,
          turnCompleted: true,
          durationMs: 2_700,
          eventMethods: ["turn/started", "item/completed", "turn/completed"],
          notifications: [
            { method: "turn/started", params: { threadId, turn: { id: turnId } } },
            {
              method: "item/completed",
              params: {
                threadId,
                turnId,
                item: { type: "agentMessage", text: JSON.stringify(payload) },
              },
            },
            { method: "turn/completed", params: { threadId, turn: { id: turnId } } },
          ],
        };
      },
    },
  };
}

function requestRecord(
  args: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> {
  const request = args?.["request"];
  if (typeof request === "object" && request !== null && !Array.isArray(request)) {
    const record: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(request)) record[key] = value;
    return record;
  }
  throw new Error("Expected structured turn request args.");
}

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_desktop_research_pack",
    name: "Desktop Research Pack",
    initialPrompt: "AI 인프라 지출 동향 리서치 덱",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "RESEARCHING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function briefFixture(): InterviewBrief {
  return {
    id: "brief_desktop_research_pack",
    goal: "AI 인프라 지출 동향 리서치",
    audience: "전략팀",
    desiredOutcome: "투자 테마 우선순위 결정",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["정확한"],
    mustInclude: ["공식 지출 데이터", "최신 벤치마크"],
    mustAvoid: ["출처 없는 시장 규모"],
    successCriteria: ["공식 출처 기반"],
    openQuestions: [],
    approvedHash: "sha256:brief",
  };
}

function researchPackFixture(): ResearchPack {
  return {
    id: "research_live_pack",
    sources: [
      {
        id: "src_ai_spend",
        title: "AI infrastructure spending report",
        publisher: "Example Investor Relations",
        year: 2026,
        grade: "A",
        sourceType: "company",
        usePolicy: "priority",
        url: "https://example.com/ai-spend",
        capture: {
          originalUrl: "https://example.com/ai-spend",
          finalUrl: "https://example.com/ai-spend",
          fetchedAt: 1_789_810_001,
          mimeType: "text/html",
          statusCode: 200,
          contentHash: "sha256:raw-ai-spend",
          rawArchivePath: "docs/live-source-capture-bundle/src_ai_spend/original.html",
          textArchivePath: "docs/live-source-capture-bundle/src_ai_spend/extracted.txt",
          extractedTextHash: "sha256:text-ai-spend",
          version: 1,
        },
      },
    ],
    claims: [
      {
        id: "claim_001",
        statement: "AI infrastructure spending grew by 67% in 2026.",
        sourceIds: ["src_ai_spend"],
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
            baseYear: 2026,
            geography: "Global",
            definition: "Year-over-year AI infrastructure spending growth",
            sourceId: "src_ai_spend",
            datasetId: "dataset_001",
          },
        ],
      },
    ],
    datasets: [
      {
        id: "dataset_001",
        title: "AI infrastructure spending growth",
        sourceIds: ["src_ai_spend"],
        unit: "%",
        period: "2026",
        geography: "Global",
        definition: "Year-over-year AI infrastructure spending growth",
        rows: [{ label: "2026", value: 67, year: 2026 }],
        uncertain: false,
      },
    ],
    charts: [
      {
        id: "chart_001",
        title: "AI infrastructure spending growth",
        chartType: "bar",
        datasetId: "dataset_001",
        unit: "%",
        period: "2026",
        sourceIds: ["src_ai_spend"],
        slideCandidates: [1],
        uncertain: false,
      },
    ],
    factCheckReport: {
      summary: "Live source supports one numeric claim.",
      generatedAt: 1_789_810_002,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    liveEvidenceRefs: [
      {
        id: "ev_claim_001_src_ai_spend_quote",
        claimId: "claim_001",
        sourceId: "src_ai_spend",
        sourceArtifactPath: "docs/live-source-capture-bundle/src_ai_spend/original.html",
        kind: "quote_span",
        quoteSpan: { start: 0, end: 3, text: "67%" },
        datasetId: "dataset_001",
      },
    ],
  };
}

function blockedResearchPackFixture(): ResearchPack {
  const pack = researchPackFixture();
  return {
    ...pack,
    sources: pack.sources.map((source) => ({ ...source, capture: undefined })),
  };
}
