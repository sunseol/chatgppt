import { describe, expect, test } from "bun:test";
import type { ResearchPack } from "./deck-types";
import { createDeckProject } from "./project-creation";
import { parseProjectList, serializeProjectList } from "./project-list-codec";

describe("project list codec", () => {
  test("round-trips projects for restart recovery", () => {
    const project = createDeckProject(
      {
        name: "Restartable",
        initialPrompt: "Create a restart-safe deck",
        slideCount: 6,
        aspectRatio: "16:9",
        language: "en",
      },
      { createId: () => "p_restart", now: () => 42 },
    );

    const restored = parseProjectList(serializeProjectList([project]));

    expect(restored).toEqual([project]);
  });

  test("returns an empty list for malformed storage text", () => {
    expect(parseProjectList("{not valid json")).toEqual([]);
    expect(parseProjectList(null)).toEqual([]);
  });

  test("redacts raw live auth secrets before project DB serialization", () => {
    // Given
    const project = createDeckProject(
      {
        name: "Secret bearing prompt",
        initialPrompt:
          "OPENAI_API_KEY=sk-live-secret123 Authorization: Bearer codex.session.secret /Users/jake/.codex/auth.json",
        slideCount: 5,
        aspectRatio: "16:9",
        language: "ko",
      },
      { createId: () => "p_secret_prompt", now: () => 200 },
    );

    // When
    const serialized = serializeProjectList([project]);
    const restored = parseProjectList(serialized);

    // Then
    expect(serialized.includes("sk-live-secret123")).toBe(false);
    expect(serialized.includes("Bearer codex.session.secret")).toBe(false);
    expect(serialized.includes("/Users/jake/.codex/auth.json")).toBe(false);
    expect(serialized.includes("[redacted]")).toBe(true);
    expect(restored[0]?.initialPrompt.includes("sk-live-secret123")).toBe(false);
    expect(restored[0]?.initialPrompt.includes("[redacted]")).toBe(true);
  });

  test("redacts quoted Codex session material before project DB serialization", () => {
    const project = createDeckProject(
      {
        name: "Quoted session prompt",
        initialPrompt:
          'Run live mode with CODEX_SESSION="codex.session.secret" and {"token":"abc123def456"}',
        slideCount: 5,
        aspectRatio: "16:9",
        language: "ko",
      },
      { createId: () => "p_quoted_secret_prompt", now: () => 201 },
    );

    const serialized = serializeProjectList([project]);
    const restored = parseProjectList(serialized);

    expect(serialized.includes("codex.session.secret")).toBe(false);
    expect(serialized.includes('"token":"abc123def456"')).toBe(false);
    expect(serialized.includes('CODEX_SESSION=\\"[redacted]\\"')).toBe(true);
    expect(restored[0]?.initialPrompt.includes("codex.session.secret")).toBe(false);
  });

  test("migrates persisted research packs to current live metadata fields", () => {
    const project = {
      ...createDeckProject(
        {
          name: "Legacy research",
          initialPrompt: "Recover a stored research pack",
          slideCount: 5,
          aspectRatio: "16:9",
          language: "ko",
        },
        { createId: () => "p_legacy_research", now: () => 100 },
      ),
      stage: "RESEARCH_APPROVAL_PENDING" as const,
      research: legacyResearchPack(),
    };

    const restored = parseProjectList(JSON.stringify([project]));

    const restoredProject = restored[0];
    expect(restoredProject?.research?.liveEvidenceRefs).toEqual([]);
    expect(restoredProject?.research?.provenanceLineage).toEqual([]);
  });
});

function legacyResearchPack(): ResearchPack {
  return {
    id: "research_legacy",
    sources: [
      {
        id: "src_001",
        title: "Legacy source",
        publisher: "DeckForge",
        year: 2026,
        grade: "A",
        sourceType: "research",
        usePolicy: "priority",
      },
    ],
    claims: [
      {
        id: "claim_001",
        statement: "Legacy claim with source evidence.",
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
      summary: "Legacy pack predates live metadata fields.",
      generatedAt: 100,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
  };
}
