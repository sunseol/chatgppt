import { describe, expect, test } from "bun:test";
import type { ResearchPack, ResearchSourceCaptureMetadata } from "./research-types";
import { createApprovedResearchPackArtifact, parseResearchPack } from "./research-pack";

describe("research pack source capture history", () => {
  test("preserves source recapture history through parsing", () => {
    const parsed = parseResearchPack(researchPackWithRecaptureHistory());
    const source = parsed.sources[0];

    expect(source?.capture?.version).toBe(2);
    expect(source?.captureHistory?.map((capture) => capture.version)).toEqual([1, 2]);
    expect(source?.captureHistory?.map((capture) => capture.contentHash)).toEqual([
      "sha256:source-v1",
      "sha256:source-v2",
    ]);
  });

  test("freezes source recapture history in approved research artifacts", () => {
    const approved = createApprovedResearchPackArtifact({
      projectId: "p_capture_history",
      pack: researchPackWithRecaptureHistory(),
      version: 1,
      approvedAt: 1_789_800_000,
    });
    const history = approved.pack.sources[0]?.captureHistory;

    expect(history?.length).toBe(2);
    expect(Object.isFrozen(history)).toBe(true);
    expect(Object.isFrozen(history?.[0])).toBe(true);
  });
});

function researchPackWithRecaptureHistory(): ResearchPack {
  const firstCapture: ResearchSourceCaptureMetadata = {
    originalUrl: "https://example.gov/report",
    finalUrl: "https://example.gov/report",
    fetchedAt: 1_789_300_001,
    mimeType: "text/html",
    statusCode: 200,
    contentHash: "sha256:source-v1",
    rawArchivePath: "docs/live-source-capture-bundle/html_001/original.html",
    textArchivePath: "docs/live-source-capture-bundle/html_001/extracted.txt",
    extractedTextHash: "sha256:text-v1",
    version: 1,
  };
  const secondCapture: ResearchSourceCaptureMetadata = {
    ...firstCapture,
    fetchedAt: 1_789_400_001,
    contentHash: "sha256:source-v2",
    extractedTextHash: "sha256:text-v2",
    version: 2,
  };

  return {
    id: "research_capture_history",
    sources: [
      {
        id: "src_001",
        title: "Recaptured source",
        publisher: "Example Agency",
        year: 2026,
        grade: "A",
        sourceType: "government",
        usePolicy: "priority",
        url: "https://example.gov/report",
        capture: secondCapture,
        captureHistory: [firstCapture, secondCapture],
      },
    ],
    claims: [
      {
        id: "claim_001",
        statement: "The recaptured source supports the claim.",
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
      summary: "Source recapture history is preserved with the pack.",
      generatedAt: 1_789_800_000,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
  };
}
