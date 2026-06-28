import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { runDesktopLiveWebSearchResearchWorkflow } from "./desktop-live-web-search-workflow";
import { createProviderJobManager } from "./provider-job-manager";
import type { DeckProject, InterviewBrief } from "./deck-types";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import type { LiveWebSearchEvidence } from "./live-web-search-evidence";

const InvokeArgsSchema = z.object({
  request: z.object({
    networkAccess: z.literal(true),
  }),
});

describe("desktop live web search workflow", () => {
  test("runs a network-enabled desktop web_search turn and stores search evidence", async () => {
    // Given
    const networkAccessRequests: boolean[] = [];
    const runtime = structuredTurnRuntime(liveSearchEvidence(), networkAccessRequests);

    // When
    const result = await runDesktopLiveWebSearchResearchWorkflow({
      project: projectFixture({ brief: briefFixture() }),
      jobManager: createProviderJobManager({ createId: () => "job_desktop_web_search" }),
      tauriRuntime: runtime,
      createdAt: 1_789_800_000_000,
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") throw new Error("Expected live web search to be ready.");
    expect(networkAccessRequests).toEqual([true]);
    expect(result.evidence.researchTurnId).toBe("turn_live_web_search");
    expect(result.summary.domainCount).toBe(3);
    expect(result.patch.research.sources.map((source) => source.url)).toEqual([
      "https://example.gov/report",
      "https://example.org/research",
      "https://example.net/dataset",
    ]);
    expect(result.patch.research.provenanceLineage?.[0]?.turnId).toBe("turn_live_web_search");
  });

  test("blocks before invoking App Server when the approved brief is missing", async () => {
    // Given
    const calls: string[] = [];
    const runtime = missingBriefRuntime(calls);

    // When
    const result = await runDesktopLiveWebSearchResearchWorkflow({
      project: projectFixture(),
      jobManager: createProviderJobManager({ createId: () => "job_blocked_web_search" }),
      tauriRuntime: runtime,
      createdAt: 1_789_800_000_000,
    });

    // Then
    expect(result.kind).toBe("launch_blocked");
    expect(calls).toEqual([]);
    if (result.kind !== "launch_blocked") throw new Error("Expected launch blocker.");
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_live_brief"]);
  });
});

function structuredTurnRuntime(
  payload: LiveWebSearchEvidence,
  networkAccessRequests: boolean[],
): DeckforgeTauriRuntime {
  return {
    core: {
      invoke: async (command, args) => {
        expect(command).toBe("deckforge_codex_app_server_structured_turn");
        const parsedArgs = InvokeArgsSchema.parse(args);
        networkAccessRequests.push(parsedArgs.request.networkAccess);
        const threadId = "thread_live_web_search";
        const turnId = "turn_live_web_search";
        return {
          runtime: "codex app-server",
          threadId,
          turnId,
          turnCompleted: true,
          durationMs: 2_400,
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

function missingBriefRuntime(calls: string[]): DeckforgeTauriRuntime {
  return {
    core: {
      invoke: async (command) => {
        calls.push(command);
        return {};
      },
    },
  };
}

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_desktop_web_search",
    name: "Desktop Web Search",
    initialPrompt: "시장 조사 덱",
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
    id: "brief_desktop_web_search",
    goal: "시장 현황 조사",
    audience: "임원",
    desiredOutcome: "투자 우선순위 결정",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["정확한"],
    mustInclude: ["공식 통계", "최신 벤치마크"],
    mustAvoid: ["출처 없는 수치"],
    successCriteria: ["세 도메인 이상"],
    openQuestions: [],
    approvedHash: "sha256:brief",
  };
}

function liveSearchEvidence(): LiveWebSearchEvidence {
  return {
    researchTurnId: "pending_app_server_turn",
    webSearchMode: "live",
    queries: ["official market report", "public dataset"],
    candidates: [
      {
        id: "candidate_001",
        url: "https://example.gov/report",
        title: "Official report",
        discoveredAt: 1_789_800_001,
        query: "official market report",
        sourceCandidateType: "official",
        mode: "live",
      },
      {
        id: "candidate_002",
        url: "https://example.org/research",
        title: "Research source",
        discoveredAt: 1_789_800_002,
        query: "official market report",
        sourceCandidateType: "primary",
        mode: "live",
      },
      {
        id: "candidate_003",
        url: "https://example.net/dataset",
        title: "Dataset source",
        discoveredAt: 1_789_800_003,
        query: "public dataset",
        sourceCandidateType: "dataset",
        mode: "live",
      },
    ],
    latestnessBenchmark: {
      query: "official market report",
      mode: "live",
      completedAt: 1_789_800_100,
      candidateIds: ["candidate_001", "candidate_002", "candidate_003"],
    },
  };
}
