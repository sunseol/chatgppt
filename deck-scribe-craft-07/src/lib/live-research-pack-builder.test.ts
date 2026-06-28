import { describe, expect, test } from "bun:test";
import { extractEvidenceFromSource } from "./evidence-extractor";
import { validateLiveResearchEvidence } from "./live-research-evidence";
import { buildLiveResearchPackFromEvidence } from "./live-research-pack-builder";
import type { ResearchSourceCaptureMetadata } from "./research-types";

describe("live research pack builder", () => {
  test("builds a Research Pack with captured source metadata and live evidence refs", () => {
    // Given
    const rawContent = [
      "공식 보고서: 국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      "CLAIM | statement=국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      "NUMBER | value=67 | unit=% | baseYear=2025 | geography=KR | definition=국내 기업 AI 도구 시범 도입 비율 | quote=67%",
    ].join("\n");
    const evidence = extractEvidenceFromSource({ sourceId: "src_capture_001", rawContent });

    // When
    const pack = buildLiveResearchPackFromEvidence({
      id: "research_live_capture",
      generatedAt: 1_789_910_000,
      sources: [
        {
          id: "src_capture_001",
          title: "Captured official source",
          publisher: "Statistics Office",
          year: 2026,
          sourceType: "government",
          capture: captureMetadata(rawContent, "src_capture_001"),
        },
      ],
      evidenceResults: [evidence],
    });
    const report = validateLiveResearchEvidence({
      pack,
      evidenceRefs: pack.liveEvidenceRefs ?? [],
    });

    // Then
    expect(pack.sources[0]?.capture?.rawArchivePath).toBe(
      "docs/live-source-capture-bundle/src_capture_001/original.html",
    );
    expect(pack.liveEvidenceRefs?.[0]?.claimId).toBe("claim_001");
    expect(pack.liveEvidenceRefs?.[0]?.datasetId).toBe("dataset_001");
    expect(report.valid).toBe(true);
  });
});

function captureMetadata(rawContent: string, sourceId: string): ResearchSourceCaptureMetadata {
  return {
    originalUrl: `https://example.gov/${sourceId}`,
    finalUrl: `https://example.gov/${sourceId}?download=1`,
    fetchedAt: 1_789_910_001,
    mimeType: "text/html",
    statusCode: 200,
    contentHash: `sha256:${sourceId}:raw:${rawContent.length}`,
    rawArchivePath: `docs/live-source-capture-bundle/${sourceId}/original.html`,
    textArchivePath: `docs/live-source-capture-bundle/${sourceId}/extracted.txt`,
    extractedTextHash: `sha256:${sourceId}:text:${rawContent.length}`,
    version: 1,
  };
}
