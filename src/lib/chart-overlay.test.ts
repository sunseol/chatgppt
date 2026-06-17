import { describe, expect, test } from "bun:test";
import type { LayoutPrototype, ResearchPack } from "./deck-types";
import { buildBasicChartOverlays, renderBasicChartOverlaySvg } from "./chart-overlay";
import { buildMinimalSlideSourceMap } from "./slide-source-map";

describe("basic chart overlay", () => {
  test("creates a bar overlay from research dataset metadata", () => {
    const research = researchFixture("bar");
    const sourceMap = buildMinimalSlideSourceMap({
      slides: [slideSpecFixture()],
      research,
    });
    const result = buildBasicChartOverlays({
      research,
      layout: layoutFixture(),
      sourceMap,
    });

    expect(result.issues).toEqual([]);
    expect(result.overlays).toEqual([
      {
        id: "overlay_chart_001_slide_03",
        chartId: "chart_001",
        chartType: "bar",
        slideId: "slide_03",
        slideNumber: 3,
        placeholderId: "slide_3_chart",
        datasetId: "dataset_001",
        unit: "%",
        period: "2025",
        sourceIds: ["src_001"],
        sourceMapIds: ["claim_001", "src_001", "dataset_001"],
        rows: [
          { label: "2023", value: 42, year: 2023 },
          { label: "2024", value: 56, year: 2024 },
          { label: "2025", value: 67, year: 2025 },
        ],
      },
    ]);
  });

  test("creates a line overlay and renders svg from dataset rows", () => {
    const result = buildBasicChartOverlays({
      research: researchFixture("line"),
      layout: layoutFixture(),
      sourceMap: buildMinimalSlideSourceMap({
        slides: [slideSpecFixture()],
        research: researchFixture("line"),
      }),
    });
    const overlay = result.overlays.find((item) => item.chartType === "line");
    expect(overlay?.chartType).toBe("line");
    if (!overlay) return;

    const svg = renderBasicChartOverlaySvg(overlay);

    expect(svg.includes("<path")).toBe(true);
    expect(svg.includes("<circle")).toBe(true);
    expect(svg.includes("2025")).toBe(true);
    expect(svg.includes('data-dataset-id="dataset_001"')).toBe(true);
  });

  test("does not create overlays without source-backed datasets", () => {
    const research = researchFixture("bar", { sourceIds: [] });
    const result = buildBasicChartOverlays({
      research,
      layout: layoutFixture(),
      sourceMap: buildMinimalSlideSourceMap({
        slides: [slideSpecFixture()],
        research,
      }),
    });

    expect(result.overlays).toEqual([]);
    expect(result.fatalIssues).toEqual([
      {
        code: "source_less_dataset",
        severity: "fatal",
        chartId: "chart_001",
        datasetId: "dataset_001",
        slideId: "slide_03",
        message: "Chart chart_001 cannot render without dataset/source metadata.",
      },
    ]);
  });

  test("links overlays to layout chart placeholders", () => {
    const result = buildBasicChartOverlays({
      research: researchFixture("bar"),
      layout: layoutFixture(),
      sourceMap: buildMinimalSlideSourceMap({
        slides: [slideSpecFixture()],
        research: researchFixture("bar"),
      }),
    });

    expect(result.overlays[0]?.placeholderId).toBe("slide_3_chart");
  });
});

function researchFixture(
  chartType: "bar" | "line",
  overrides: { readonly sourceIds?: readonly string[] } = {},
): ResearchPack {
  const sourceIds = overrides.sourceIds ?? ["src_001"];
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
        sourceIds: [...sourceIds],
        datasetIds: ["dataset_001"],
        confidence: "high",
        hasNumber: true,
        needsUserReview: false,
        status: "supported",
        slideCandidates: [3],
        numericEvidence: [],
      },
    ],
    datasets: [
      {
        id: "dataset_001",
        title: "AI adoption",
        sourceIds: [...sourceIds],
        unit: "%",
        period: "2025",
        geography: "KR",
        definition: "AI 도구 시범 도입 비율",
        rows: [
          { label: "2023", value: 42, year: 2023 },
          { label: "2024", value: 56, year: 2024 },
          { label: "2025", value: 67, year: 2025 },
        ],
        uncertain: false,
      },
    ],
    charts: [
      {
        id: "chart_001",
        title: "AI 도구 시범 도입 비율",
        chartType,
        datasetId: "dataset_001",
        unit: "%",
        period: "2025",
        sourceIds: [...sourceIds],
        slideCandidates: [3],
        uncertain: false,
      },
    ],
    factCheckReport: {
      summary: "ok",
      generatedAt: 1,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
  };
}

function slideSpecFixture() {
  return {
    number: 3,
    title: "시장 변화",
    role: "Market",
    coreMessage: "국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
    bodyPoints: ["도입률", "수요"],
    visualType: "막대 차트",
    visualComposition: "막대 차트",
    evidence: ["claim_001"],
    editableElements: ["수치", "캡션"],
    dataSourceConstraints: ["claim_001", "src_001", "dataset_001"],
  };
}

function layoutFixture(): LayoutPrototype {
  return {
    id: "layout_001",
    slides: [
      {
        number: 3,
        componentType: "ChartWithInsight",
        html: '<section><div data-layer="chart"></div></section>',
        domLayers: [
          {
            id: "slide_3_title",
            role: "title",
            editable: true,
            sourceIds: [],
            datasetIds: [],
            bounds: { x: 96, y: 72, w: 1728, h: 140 },
          },
          {
            id: "slide_3_chart",
            role: "chart",
            editable: true,
            sourceIds: ["claim_001"],
            datasetIds: ["dataset_001"],
            bounds: { x: 96, y: 252, w: 1728, h: 676 },
          },
        ],
      },
    ],
  };
}
