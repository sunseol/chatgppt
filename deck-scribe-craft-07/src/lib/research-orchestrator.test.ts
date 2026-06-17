import { describe, expect, test } from "bun:test";
import {
  buildResearchPackFromEvidence,
  createResearchSourceMap,
  orchestrateResearch,
} from "./research-orchestrator";
import { extractEvidenceFromSource } from "./evidence-extractor";
import { parseResearchPack } from "./research-pack";

describe("research orchestrator", () => {
  test("generates a benchmark research pack with priority sources first", async () => {
    const fetchOrder: string[] = [];
    const result = await orchestrateResearch(
      {
        id: "research_benchmark",
        generatedAt: 1_789_300_000,
        sources: [
          sourceSpec("src_media", "media", "https://media.example/report"),
          sourceSpec("src_gov", "government", "https://gov.example/report"),
          sourceSpec("src_research", "research", "https://research.example/report"),
        ],
      },
      {
        now: () => 1_789_300_000,
        fetchUrl: async (url) => {
          fetchOrder.push(url);
          return contentByUrl(url);
        },
        readFile: async () => "unused",
      },
    );

    expect(fetchOrder).toEqual([
      "https://gov.example/report",
      "https://research.example/report",
      "https://media.example/report",
    ]);
    expect(parseResearchPack(result.pack).id).toBe("research_benchmark");
    expect(result.pack.sources.map((source) => source.id)).toEqual([
      "src_gov",
      "src_research",
      "src_media",
    ]);
    expect(result.pack.claims[0].sourceIds).toEqual(["src_gov"]);
    expect(result.pack.datasets[0].sourceIds).toEqual(["src_gov"]);
  });

  test("blocks source-less core claims", () => {
    const evidence = extractEvidenceFromSource({
      sourceId: "",
      rawContent: "CLAIM | statement=출처 없는 핵심 주장은 사용할 수 없다.",
    });

    const pack = buildResearchPackFromEvidence({
      id: "research_sourceless",
      generatedAt: 1_789_300_001,
      sources: [sourceRecord("src_gov", "government")],
      evidenceResults: [evidence],
    });

    expect(pack.claims.length).toBe(0);
    expect(pack.factCheckReport.fatalIssueCount).toBe(1);
    expect(pack.factCheckReport.issues[0].severity).toBe("fatal");
  });

  test("marks conflicting evidence for review", async () => {
    const result = await orchestrateResearch(
      {
        id: "research_conflict",
        generatedAt: 1_789_300_002,
        sources: [sourceSpec("src_research", "research", "https://research.example/conflict")],
      },
      {
        now: () => 1_789_300_002,
        fetchUrl: async () =>
          "CLAIM | statement=시장 성장률 전망은 기관마다 상충된다. | status=conflicting | confidence=medium",
        readFile: async () => "unused",
      },
    );

    expect(result.pack.claims[0].status).toBe("conflicting");
    expect(result.pack.claims[0].needsUserReview).toBe(true);
    expect(
      result.pack.factCheckReport.uncertainItems.includes("시장 성장률 전망은 기관마다 상충된다."),
    ).toBe(true);
  });

  test("creates minimal source map entries", async () => {
    const result = await orchestrateResearch(
      {
        id: "research_source_map",
        generatedAt: 1_789_300_003,
        sources: [sourceSpec("src_gov", "government", "https://gov.example/report")],
      },
      {
        now: () => 1_789_300_003,
        fetchUrl: async (url) => contentByUrl(url),
        readFile: async () => "unused",
      },
    );

    expect(createResearchSourceMap(result.pack)).toEqual([
      {
        claimId: "claim_001",
        sourceIds: ["src_gov"],
        datasetIds: ["dataset_001"],
        slideCandidates: [1],
      },
    ]);
  });
});

function sourceSpec(id: string, sourceType: "government" | "research" | "media", url: string) {
  return {
    id,
    title: `${id} report`,
    publisher: `${id} publisher`,
    year: 2026,
    sourceType,
    kind: "web_page" as const,
    url,
  };
}

function sourceRecord(id: string, sourceType: "government" | "research" | "media") {
  return {
    id,
    title: `${id} report`,
    publisher: `${id} publisher`,
    year: 2026,
    sourceType,
  };
}

function contentByUrl(url: string): string {
  if (url.includes("gov")) {
    return [
      "공식 보고서: 국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      "CLAIM | statement=국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      "NUMBER | value=67 | unit=% | baseYear=2025 | geography=KR | definition=국내 기업 AI 도구 시범 도입 비율 | quote=67%",
    ].join("\n");
  }
  if (url.includes("research")) {
    return "CLAIM | statement=검증 부재는 생성형 AI 도입의 주요 장벽이다.";
  }
  return "CLAIM | statement=언론 보도는 보조 맥락으로만 사용한다.";
}
