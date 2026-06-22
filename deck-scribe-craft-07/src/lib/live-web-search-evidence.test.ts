import { describe, expect, test } from "bun:test";
import {
  summarizeLiveWebSearchEvidence,
  validateLiveWebSearchEvidence,
  type LiveWebSearchEvidence,
} from "./live-web-search-evidence";

describe("live web search evidence", () => {
  test("passes a live web search event with three domains and required metadata", () => {
    // Given
    const evidence = liveSearchEvidence();

    // When
    const report = validateLiveWebSearchEvidence(evidence);
    const summary = summarizeLiveWebSearchEvidence(evidence, report);

    // Then
    expect(report).toEqual({ valid: true, issues: [] });
    expect(summary).toEqual({
      queryCount: 2,
      candidateCount: 3,
      liveCandidateCount: 3,
      domainCount: 3,
      latestnessBenchmarkMode: "live",
      blockingIssueCodes: [],
    });
  });

  test("blocks cached-only latestness and non-live candidate contamination", () => {
    // Given
    const evidence = liveSearchEvidence({
      latestnessBenchmark: {
        query: "AI adoption report 2026",
        mode: "cached",
        completedAt: 1_789_600_100,
        candidateIds: ["candidate_001"],
      },
      candidates: [
        {
          id: "candidate_001",
          url: "https://example.gov/report",
          title: "Official AI adoption report",
          discoveredAt: 1_789_600_001,
          query: "AI adoption report 2026",
          sourceCandidateType: "official",
          mode: "live",
        },
        {
          id: "candidate_002",
          url: "https://cached.example.com/summary",
          title: "Cached summary",
          discoveredAt: 1_789_600_002,
          query: "AI adoption report 2026",
          sourceCandidateType: "secondary",
          mode: "cached",
        },
        {
          id: "candidate_003",
          url: "https://mock.example.net/fake",
          title: "Mock source",
          discoveredAt: 1_789_600_003,
          query: "AI adoption report 2026",
          sourceCandidateType: "secondary",
          mode: "mock",
        },
      ],
    });

    // When
    const report = validateLiveWebSearchEvidence(evidence);

    // Then
    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "non_live_search_candidate",
      "non_live_search_candidate",
      "insufficient_live_domains",
      "cached_latestness_benchmark",
    ]);
  });

  test("blocks missing metadata and insufficient domain diversity", () => {
    // Given
    const evidence = liveSearchEvidence({
      candidates: [
        {
          id: "candidate_001",
          url: "not a url",
          title: "",
          discoveredAt: 0,
          query: "",
          sourceCandidateType: "official",
          mode: "live",
        },
        {
          id: "candidate_002",
          url: "https://example.gov/second",
          title: "Second result",
          discoveredAt: 1_789_600_002,
          query: "AI adoption report 2026",
          sourceCandidateType: "secondary",
          mode: "live",
        },
      ],
    });

    // When
    const report = validateLiveWebSearchEvidence(evidence);

    // Then
    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "missing_candidate_metadata",
      "missing_candidate_metadata",
      "missing_candidate_metadata",
      "insufficient_live_domains",
      "unknown_latestness_candidate",
    ]);
  });

  test("blocks candidates and latestness benchmarks whose query is not in the event log", () => {
    // Given
    const evidence = liveSearchEvidence({
      queries: ["AI adoption report 2026"],
      candidates: [
        {
          ...liveSearchEvidence().candidates[0],
          query: "unrecorded query",
        },
        liveSearchEvidence().candidates[1],
        liveSearchEvidence().candidates[2],
      ],
      latestnessBenchmark: {
        ...liveSearchEvidence().latestnessBenchmark,
        query: "unrecorded benchmark query",
      },
    });

    // When
    const report = validateLiveWebSearchEvidence(evidence);

    // Then
    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "candidate_query_not_recorded",
      "candidate_query_not_recorded",
      "candidate_query_not_recorded",
      "latestness_query_not_recorded",
    ]);
  });
});

function liveSearchEvidence(overrides: Partial<LiveWebSearchEvidence> = {}): LiveWebSearchEvidence {
  return {
    researchTurnId: "turn_research_search_001",
    webSearchMode: "live",
    queries: ["AI adoption report 2026", "enterprise AI adoption statistics"],
    candidates: [
      {
        id: "candidate_001",
        url: "https://example.gov/report",
        title: "Official AI adoption report",
        discoveredAt: 1_789_600_001,
        query: "AI adoption report 2026",
        sourceCandidateType: "official",
        mode: "live",
      },
      {
        id: "candidate_002",
        url: "https://example.org/research",
        title: "Research institute benchmark",
        discoveredAt: 1_789_600_002,
        query: "enterprise AI adoption statistics",
        sourceCandidateType: "primary",
        mode: "live",
      },
      {
        id: "candidate_003",
        url: "https://example.net/dataset",
        title: "Public dataset",
        discoveredAt: 1_789_600_003,
        query: "enterprise AI adoption statistics",
        sourceCandidateType: "dataset",
        mode: "live",
      },
    ],
    latestnessBenchmark: {
      query: "AI adoption report 2026",
      mode: "live",
      completedAt: 1_789_600_100,
      candidateIds: ["candidate_001", "candidate_002", "candidate_003"],
    },
    ...overrides,
  };
}
