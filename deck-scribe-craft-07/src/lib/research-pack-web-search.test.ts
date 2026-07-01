import { describe, expect, test } from "bun:test";
import type { ResearchPack } from "./deck-types";
import type { LiveWebSearchEvidence } from "./live-web-search-evidence";
import { createApprovedResearchPackArtifact, parseResearchPack } from "./research-pack";

describe("research pack web search evidence", () => {
  test("preserves live web search evidence through parsing", () => {
    const parsed = parseResearchPack({
      ...researchPack(),
      webSearchEvidence: liveWebSearchEvidence(),
    });

    expect(parsed.webSearchEvidence?.researchTurnId).toBe("turn_search_001");
    expect(parsed.webSearchEvidence?.candidates[0]?.url).toBe("https://example.gov/report");
    expect(parsed.webSearchEvidence?.latestnessBenchmark.candidateIds).toEqual([
      "candidate_001",
      "candidate_002",
      "candidate_003",
    ]);
  });

  test("preserves live web search evidence in approved research artifacts", () => {
    const approved = createApprovedResearchPackArtifact({
      projectId: "p_search_evidence",
      pack: {
        ...researchPack(),
        webSearchEvidence: liveWebSearchEvidence(),
      },
      version: 1,
      approvedAt: 1_789_700_000,
    });

    expect(approved.pack.webSearchEvidence?.webSearchMode).toBe("live");
    expect(Object.isFrozen(approved.pack.webSearchEvidence)).toBe(true);
  });
});

function researchPack(): ResearchPack {
  return {
    id: "research_search",
    sources: [
      {
        id: "src_001",
        title: "Search-backed source",
        publisher: "Example Agency",
        year: 2026,
        grade: "A",
        sourceType: "government",
        usePolicy: "priority",
        url: "https://example.gov/report",
      },
    ],
    claims: [
      {
        id: "claim_001",
        statement: "The search-backed source supports the claim.",
        sourceIds: ["src_001"],
        datasetIds: [],
        confidence: "high",
        hasNumber: false,
        needsUserReview: false,
        status: "supported",
        slideCandidates: [1],
        numericEvidence: [],
      },
    ],
    datasets: [],
    charts: [],
    factCheckReport: {
      summary: "Search evidence is preserved with the pack.",
      generatedAt: 1_789_700_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
  };
}

function liveWebSearchEvidence(): LiveWebSearchEvidence {
  return {
    researchTurnId: "turn_search_001",
    webSearchMode: "live",
    queries: ["official market report", "public dataset"],
    candidates: [
      {
        id: "candidate_001",
        url: "https://example.gov/report",
        title: "Official report",
        discoveredAt: 1_789_700_001,
        query: "official market report",
        sourceCandidateType: "official",
        mode: "live",
      },
      {
        id: "candidate_002",
        url: "https://example.org/research",
        title: "Research source",
        discoveredAt: 1_789_700_002,
        query: "official market report",
        sourceCandidateType: "primary",
        mode: "live",
      },
      {
        id: "candidate_003",
        url: "https://example.net/dataset",
        title: "Dataset source",
        discoveredAt: 1_789_700_003,
        query: "public dataset",
        sourceCandidateType: "dataset",
        mode: "live",
      },
    ],
    latestnessBenchmark: {
      query: "official market report",
      mode: "live",
      completedAt: 1_789_700_100,
      candidateIds: ["candidate_001", "candidate_002", "candidate_003"],
    },
  };
}
