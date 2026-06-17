import { describe, expect, test } from "bun:test";
import type { ResearchPack, SlideSpec } from "./deck-types";
import {
  applySourceMapCorrection,
  createImageGenerationSourceMapGate,
  createSlideSourceMapReview,
} from "./source-map-review";
import { buildMinimalSlideSourceMap, type MinimalSlideSourceMap } from "./slide-source-map";

describe("source map review", () => {
  test("summarizes accepted links rejected claims and image generation block state", () => {
    const research = researchFixture();
    const map = buildMinimalSlideSourceMap({
      slides: [slideFixture(1, ["claim_001"]), slideFixture(2, ["claim_bad"])],
      research,
    });

    const review = createSlideSourceMapReview({ map, research });

    expect(review.fatalIssueCount).toBe(1);
    expect(review.imageGenerationGate.status).toBe("blocked");
    expect(review.imageGenerationGate.blockedSlideIds).toEqual(["slide_02"]);
    expect(review.slides.map((slide) => slide.status)).toEqual(["ready", "blocked"]);

    const accepted = requiredSlide(review, "slide_01");
    expect(accepted.claims.map((claim) => claim.id)).toEqual(["claim_001"]);
    expect(accepted.sources.map((source) => source.label)).toEqual(["AI adoption report"]);
    expect(accepted.datasets.map((dataset) => dataset.label)).toEqual(["AI adoption"]);

    const blocked = requiredSlide(review, "slide_02");
    expect(blocked.rejectedClaims.map((claim) => claim.id)).toEqual(["claim_bad"]);
    expect(blocked.issueMessages).toEqual([
      "Slide slide_02 references numeric claim claim_bad without source or dataset.",
    ]);
  });

  test("applies a manual correction without mutating the original map", () => {
    const map = buildMinimalSlideSourceMap({
      slides: [slideFixture(2, ["claim_bad"])],
      research: researchFixture(),
    });

    const corrected = applySourceMapCorrection(map, {
      slideId: "slide_02",
      claimIds: ["claim_bad"],
      sourceIds: ["src_001"],
      rejectedClaimIds: [],
      resolvedIssueClaimIds: ["claim_bad"],
    });

    expect(requiredEntry(map, "slide_02").rejectedClaimIds).toEqual(["claim_bad"]);
    expect(requiredEntry(corrected, "slide_02").claimIds).toEqual(["claim_bad"]);
    expect(requiredEntry(corrected, "slide_02").sourceIds).toEqual(["src_001"]);
    expect(requiredEntry(corrected, "slide_02").rejectedClaimIds).toEqual([]);
    expect(corrected.fatalIssues).toEqual([]);
  });

  test("blocks image generation when the source map has fatal source-less numeric issues", () => {
    const map = buildMinimalSlideSourceMap({
      slides: [slideFixture(2, ["claim_bad"])],
      research: researchFixture(),
    });

    const gate = createImageGenerationSourceMapGate(map);

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toEqual([
      "Slide slide_02 references numeric claim claim_bad without source or dataset.",
    ]);
  });
});

function requiredSlide(
  review: ReturnType<typeof createSlideSourceMapReview>,
  slideId: string,
): ReturnType<typeof createSlideSourceMapReview>["slides"][number] {
  const slide = review.slides.find((item) => item.slideId === slideId);
  if (!slide) throw new Error(`Missing review slide ${slideId}.`);
  return slide;
}

function requiredEntry(
  map: MinimalSlideSourceMap,
  slideId: string,
): MinimalSlideSourceMap["entries"][number] {
  const entry = map.entries.find((item) => item.slideId === slideId);
  if (!entry) throw new Error(`Missing source map entry ${slideId}.`);
  return entry;
}

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
