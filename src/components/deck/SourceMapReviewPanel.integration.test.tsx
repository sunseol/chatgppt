import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SourceMapReviewPanel } from "@/components/deck/SourceMapReviewPanel";
import type { ResearchPack, SlideSpec } from "@/lib/deck-types";
import { createSlideSourceMapReview } from "@/lib/source-map-review";
import { buildMinimalSlideSourceMap } from "@/lib/slide-source-map";

describe("SourceMapReviewPanel", () => {
  test("renders slide evidence links fatal issues and manual correction controls", () => {
    const research = researchFixture();
    const map = buildMinimalSlideSourceMap({
      slides: [slideFixture(1, ["claim_001"]), slideFixture(2, ["claim_bad"])],
      research,
    });
    const review = createSlideSourceMapReview({ map, research });

    const markup = renderToStaticMarkup(
      <SourceMapReviewPanel
        review={review}
        correctionText="claim_bad에 src_001 연결"
        disabled={false}
        onCorrectionTextChange={() => undefined}
        onApplyCorrection={() => undefined}
      />,
    );

    expect(markup.includes("슬라이드별 근거 맵")).toBe(true);
    expect(markup.includes("slide_01")).toBe(true);
    expect(markup.includes("claim_001")).toBe(true);
    expect(markup.includes("src_001")).toBe(true);
    expect(markup.includes("dataset_001")).toBe(true);
    expect(markup.includes("claim_bad")).toBe(true);
    expect(markup.includes("이미지 생성 차단")).toBe(true);
    expect(markup.includes("Source Map 보정 요청")).toBe(true);
  });
});

function slideFixture(number: number, evidence: readonly string[]): SlideSpec {
  return {
    number,
    title: "시장 변화",
    role: "Market",
    coreMessage: "국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
    bodyPoints: ["도입률", "자동화 수요"],
    visualType: "막대 차트",
    visualComposition: "막대 차트",
    evidence: [...evidence],
    editableElements: ["수치", "캡션"],
    dataSourceConstraints: [...evidence],
  };
}

function researchFixture(): ResearchPack {
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
        numericEvidence: [],
      },
      {
        id: "claim_bad",
        statement: "출처 없는 99% 수치",
        sourceIds: [],
        datasetIds: [],
        confidence: "assumption",
        hasNumber: true,
        needsUserReview: true,
        status: "assumption",
        slideCandidates: [2],
        numericEvidence: [],
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
  };
}
