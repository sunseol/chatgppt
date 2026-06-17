import { describe, expect, test } from "bun:test";
import type { LayoutPrototype, ResearchPack, SlideSpec } from "./deck-types";
import { prepareChartDataPipeline } from "./chart-data-pipeline";
import { buildMinimalSlideSourceMap } from "./slide-source-map";

describe("chart data preparation pipeline", () => {
  test("prepares source-backed chart metadata and matching layout/final bindings", () => {
    const research = researchFixture("bar");
    const sourceMap = buildMinimalSlideSourceMap({
      slides: [slideSpecFixture()],
      research,
    });

    const result = prepareChartDataPipeline({
      research,
      layout: layoutFixture(),
      sourceMap,
    });

    expect(result.fatalIssues).toEqual([]);
    expect(result.records).toEqual([
      {
        chartId: "chart_001",
        chartType: "bar",
        datasetId: "dataset_001",
        slideId: "slide_03",
        slideNumber: 3,
        unit: "%",
        period: "2023-2025",
        baseYears: [2023, 2024, 2025],
        sourceIds: ["src_001"],
        sourceMapIds: ["claim_001", "src_001", "dataset_001"],
        layoutBinding: {
          chartId: "chart_001",
          placeholderId: "slide_3_chart",
        },
        finalLayerBinding: {
          chartId: "chart_001",
          chartOverlayId: "overlay_chart_001_slide_03",
        },
        renderMode: "editable_overlay",
        imageModelPolicy:
          "Image model must not draw chart values for chart_001; leave placeholder slide_3_chart for DeckForge editable overlay rendering.",
      },
    ]);
  });

  test("prepares table chart metadata without requiring table rendering", () => {
    const research = researchFixture("table");
    const result = prepareChartDataPipeline({
      research,
      layout: layoutFixture(),
      sourceMap: buildMinimalSlideSourceMap({ slides: [slideSpecFixture()], research }),
    });

    expect(result.records[0]?.chartType).toBe("table");
    expect(result.records[0]?.renderMode).toBe("editable_overlay");
    expect(result.records[0]?.finalLayerBinding.chartId).toBe("chart_001");
  });

  test("returns fatal issues for missing placeholders and source-less chart data", () => {
    const research = researchFixture("line", { sourceIds: [] });
    const result = prepareChartDataPipeline({
      research,
      layout: layoutFixture({ includeChartPlaceholder: false }),
      sourceMap: buildMinimalSlideSourceMap({ slides: [slideSpecFixture()], research }),
    });

    expect(result.records).toEqual([]);
    expect(result.fatalIssues).toEqual([
      {
        code: "missing_placeholder",
        severity: "fatal",
        chartId: "chart_001",
        datasetId: "dataset_001",
        slideId: "slide_03",
        message: "Chart chart_001 cannot bind to a layout chart placeholder on slide_03.",
      },
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
});

function researchFixture(
  chartType: "bar" | "line" | "table",
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
        period: "2023-2025",
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
        period: "2023-2025",
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

function slideSpecFixture(): SlideSpec {
  return {
    number: 3,
    title: "시장 변화",
    role: "Market",
    coreMessage: "국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
    bodyPoints: ["도입률", "수요"],
    visualType: "막대 차트",
    evidence: ["claim_001"],
    editableElements: ["차트 값", "출처 캡션"],
    dataSourceConstraints: ["dataset_001"],
  };
}

function layoutFixture(
  options: { readonly includeChartPlaceholder?: boolean } = {},
): LayoutPrototype {
  const includeChartPlaceholder = options.includeChartPlaceholder ?? true;
  return {
    id: "layout_001",
    slides: [
      {
        number: 3,
        componentType: "ChartWithInsight",
        html: "<section></section>",
        domLayers: includeChartPlaceholder
          ? [
              {
                id: "slide_3_chart",
                role: "chart",
                editable: true,
                sourceIds: ["src_001"],
                datasetIds: ["dataset_001"],
                bounds: { x: 10, y: 10, w: 100, h: 60 },
              },
            ]
          : [],
      },
    ],
  };
}
