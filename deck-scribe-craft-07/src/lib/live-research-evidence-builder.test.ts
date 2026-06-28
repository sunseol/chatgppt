import { describe, expect, test } from "bun:test";
import { extractEvidenceFromSource } from "./evidence-extractor";
import {
  attachLiveResearchEvidenceRefs,
  createLiveResearchEvidenceRefs,
} from "./live-research-evidence-builder";
import { getDeckPlanEligibleClaims, validateLiveResearchEvidence } from "./live-research-evidence";
import { buildResearchPackFromEvidence } from "./research-orchestrator";
import type { ResearchPack, ResearchSourceCaptureMetadata, Source } from "./research-types";

describe("live research evidence builder", () => {
  test("creates quote-span evidence refs from captured source artifacts", () => {
    // Given
    const rawContent = [
      "공식 보고서: 국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      "CLAIM | statement=국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      "NUMBER | value=67 | unit=% | baseYear=2025 | geography=KR | definition=국내 기업 AI 도구 시범 도입 비율 | quote=67%",
    ].join("\n");
    const evidence = extractEvidenceFromSource({ sourceId: "src_001", rawContent });
    const pack = capturedPackFromEvidence(rawContent, "src_001", [evidence]);

    // When
    const withRefs = attachLiveResearchEvidenceRefs({
      pack,
      evidenceResults: [evidence],
    });
    const report = validateLiveResearchEvidence({
      pack: withRefs,
      evidenceRefs: withRefs.liveEvidenceRefs ?? [],
    });

    // Then
    expect(withRefs.liveEvidenceRefs?.[0]?.kind).toBe("quote_span");
    expect(withRefs.liveEvidenceRefs?.[0]?.sourceArtifactPath).toBe(
      "docs/live-source-capture-bundle/src_001/original.html",
    );
    expect(report.valid).toBe(true);
    expect(getDeckPlanEligibleClaims(withRefs, report).map((claim) => claim.id)).toEqual([
      "claim_001",
    ]);
  });

  test("creates table evidence refs when the captured source exposes table coordinates", () => {
    // Given
    const rawContent = [
      "TABLE | statement=The benchmark table reports the 2025 adoption rate. | tableId=table_001 | rowKey=2025 | columnKey=adoption_rate",
      "NUMBER | value=67 | unit=% | baseYear=2025 | geography=KR | definition=AI adoption rate | quote=67%",
    ].join("\n");
    const evidence = extractEvidenceFromSource({ sourceId: "src_table", rawContent });
    const pack = capturedPackFromEvidence(rawContent, "src_table", [evidence]);

    // When
    const refs = createLiveResearchEvidenceRefs({ pack, evidenceResults: [evidence] });

    // Then
    expect(refs.length).toBe(1);
    expect(refs[0]).toEqual({
      id: "ev_claim_001_src_table_table",
      claimId: "claim_001",
      sourceId: "src_table",
      sourceArtifactPath: "docs/live-source-capture-bundle/src_table/original.html",
      kind: "table_reference",
      tableRef: {
        tableId: "table_001",
        rowKey: "2025",
        columnKey: "adoption_rate",
      },
      datasetId: "dataset_001",
    });
  });

  test("does not synthesize evidence refs when the source has no captured artifact", () => {
    // Given
    const rawContent = "CLAIM | statement=검색 요약만 있는 주장은 승인할 수 없다.";
    const evidence = extractEvidenceFromSource({ sourceId: "src_uncaptured", rawContent });
    const pack = buildResearchPackFromEvidence({
      id: "research_uncaptured",
      generatedAt: 1_789_900_002,
      sources: [sourceRecord("src_uncaptured")],
      evidenceResults: [evidence],
    });

    // When
    const refs = createLiveResearchEvidenceRefs({ pack, evidenceResults: [evidence] });

    // Then
    expect(refs).toEqual([]);
  });
});

function capturedPackFromEvidence(
  rawContent: string,
  sourceId: string,
  evidenceResults: Parameters<typeof buildResearchPackFromEvidence>[0]["evidenceResults"],
): ResearchPack {
  const pack = buildResearchPackFromEvidence({
    id: `research_${sourceId}`,
    generatedAt: 1_789_900_000,
    sources: [sourceRecord(sourceId)],
    evidenceResults,
  });
  const [source] = pack.sources;
  if (!source) throw new Error("research fixture expected a source");
  return {
    ...pack,
    sources: [{ ...source, capture: captureMetadata(rawContent, sourceId) }],
  };
}

function sourceRecord(id: string) {
  return {
    id,
    title: `${id} source`,
    publisher: "Example Research",
    year: 2026,
    sourceType: "research" as const,
  };
}

function captureMetadata(rawContent: string, sourceId: string): ResearchSourceCaptureMetadata {
  return {
    originalUrl: `https://example.org/${sourceId}`,
    finalUrl: `https://example.org/${sourceId}?download=1`,
    fetchedAt: 1_789_900_001,
    mimeType: "text/html",
    statusCode: 200,
    contentHash: `sha256:${sourceId}:raw:${rawContent.length}`,
    rawArchivePath: `docs/live-source-capture-bundle/${sourceId}/original.html`,
    textArchivePath: `docs/live-source-capture-bundle/${sourceId}/extracted.txt`,
    extractedTextHash: `sha256:${sourceId}:text:${rawContent.length}`,
    version: 1,
  };
}
