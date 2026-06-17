import { describe, expect, test } from "bun:test";
import type { DeckProject, ResearchPack, SlideSpec } from "./deck-types";
import { buildGenerationReport } from "./generation-report";
import {
  buildMinimalSlideSourceMap,
  createSlidePromptSourceMapReference,
  formatMinimalSourceMapForReport,
} from "./slide-source-map";

describe("minimal slide source map", () => {
  test("links slide specs to claim source and dataset ids", () => {
    const map = buildMinimalSlideSourceMap({
      slides: [slideFixture(["claim_001"])],
      research: researchFixture(),
    });

    expect(map.fatalIssues).toEqual([]);
    expect(map.entries).toEqual([
      {
        slideId: "slide_01",
        slideNumber: 1,
        claimIds: ["claim_001"],
        sourceIds: ["src_001"],
        datasetIds: ["dataset_001"],
        rejectedClaimIds: [],
      },
    ]);
  });

  test("blocks source-less numeric claims from context", () => {
    const map = buildMinimalSlideSourceMap({
      slides: [slideFixture(["claim_bad"])],
      research: researchFixture({
        claims: [
          {
            ...researchFixture().claims[0],
            id: "claim_bad",
            statement: "출처 없는 99% 수치",
            sourceIds: [],
            datasetIds: [],
            hasNumber: true,
            numericEvidence: [],
          },
        ],
      }),
    });

    expect(map.entries[0]?.claimIds).toEqual([]);
    expect(map.entries[0]?.rejectedClaimIds).toEqual(["claim_bad"]);
    expect(map.fatalIssues).toEqual([
      {
        code: "source_less_number",
        severity: "fatal",
        slideId: "slide_01",
        claimId: "claim_bad",
        message: "Slide slide_01 references numeric claim claim_bad without source or dataset.",
      },
    ]);
  });

  test("formats generation report and prompt reference sections", () => {
    const map = buildMinimalSlideSourceMap({
      slides: [slideFixture(["claim_001"])],
      research: researchFixture(),
    });
    const entry = map.entries.find((item) => item.slideId === "slide_01");
    expect(entry?.slideId).toBe("slide_01");
    if (!entry) return;

    const report = formatMinimalSourceMapForReport(map);
    const promptReference = createSlidePromptSourceMapReference(entry);

    expect(report.includes("## 4. 슬라이드별 근거 맵")).toBe(true);
    expect(report.includes("slide_01")).toBe(true);
    expect(report.includes("claim_001")).toBe(true);
    expect(report.includes("src_001")).toBe(true);
    expect(report.includes("dataset_001")).toBe(true);
    expect(promptReference.sourceMapIds).toEqual(["claim_001", "src_001", "dataset_001"]);
  });

  test("generation report displays the minimal source map", () => {
    const report = buildGenerationReport(projectFixture());

    expect(report.includes("## 4. 슬라이드별 근거 맵")).toBe(true);
    expect(report.includes("slide_01")).toBe(true);
    expect(report.includes("claim_001")).toBe(true);
  });

  test("generation report includes prompt package versions", () => {
    const report = buildGenerationReport(projectFixture());

    expect(report.includes("## 9. 사용된 프롬프트 버전")).toBe(true);
    expect(report.includes("slide_generation")).toBe(true);
    expect(report.includes("prompts/slide_generation.v1.md")).toBe(true);
  });
});

function slideFixture(evidence: readonly string[]): SlideSpec {
  return {
    number: 1,
    title: "시장 변화",
    role: "Market",
    coreMessage: "국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
    bodyPoints: ["도입률", "자동화 수요"],
    visualType: "막대 차트",
    visualComposition: "막대 차트",
    evidence: [...evidence],
    editableElements: ["수치", "캡션"],
    dataSourceConstraints: ["claim_001", "src_001", "dataset_001"],
  };
}

function researchFixture(overrides: Partial<ResearchPack> = {}): ResearchPack {
  return {
    id: "research_001",
    sources: [
      {
        id: "src_001",
        title: "AI adoption report",
        publisher: "Statistics Office",
        year: 2026,
        grade: "A",
        sourceType: "government",
        usePolicy: "priority",
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
            definition: "AI 도구 시범 도입 비율",
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
        definition: "AI 도구 시범 도입 비율",
        rows: [{ label: "2025", value: 67, year: 2025 }],
        uncertain: false,
      },
    ],
    charts: [],
    factCheckReport: {
      summary: "ok",
      generatedAt: 1,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    ...overrides,
  };
}

function projectFixture(): DeckProject {
  return {
    id: "project_001",
    name: "Source Map Deck",
    initialPrompt: "투자 유치 피치덱",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage: "FINAL_REPORTING",
    createdAt: 1,
    updatedAt: 1,
    brief: {
      id: "brief_001",
      goal: "투자 유치",
      audience: "VC",
      desiredOutcome: "후속 미팅",
      slideCount: 8,
      aspectRatio: "16:9",
      language: "ko",
      tone: ["신뢰감"],
      mustInclude: [],
      mustAvoid: [],
      successCriteria: [],
      openQuestions: [],
    },
    research: researchFixture(),
    plan: {
      id: "plan_001",
      markdown: "# Deck Plan",
      slides: [slideFixture(["claim_001"])],
    },
    invalidated: {},
    approvalLog: [],
  };
}
