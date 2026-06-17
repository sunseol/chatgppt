import { describe, expect, test } from "bun:test";
import type { ReconstructedTextLayer } from "./text-layer-reconstruction";
import { runKoreanTypographyBenchmark } from "./korean-typography-qa";

describe("Korean typography benchmark", () => {
  test("passes readable Korean title body source and mixed number text", () => {
    const report = runKoreanTypographyBenchmark({
      layers: readableBenchmarkLayers(),
    });

    expect(report.passed).toBe(true);
    expect(report.summary.corruptedLayerCount).toBe(0);
    expect(report.summary.mixedTextLayerCount).toBe(1);
    expect(report.summary.sourceCaptionCount).toBe(1);
    expect(report.summary.lineWrapRiskCount).toBe(0);
    expect(report.issues).toEqual([]);
  });

  test("fails when Korean text contains replacement characters", () => {
    const report = runKoreanTypographyBenchmark({
      layers: [
        layer({
          id: "body_corrupt",
          role: "body",
          text: "시장 � 성장",
          sizePx: 30,
          lineHeight: 1.42,
        }),
      ],
    });

    expect(report.passed).toBe(false);
    expect(report.summary.corruptedLayerCount).toBe(1);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "corrupted-text",
      "mixed-text-missing",
      "source-caption-missing",
    ]);
  });

  test("fails small source captions and tight line-height", () => {
    const report = runKoreanTypographyBenchmark({
      layers: [
        layer({
          id: "source_tiny",
          role: "source",
          text: "출처: 통계청 2026",
          sizePx: 14,
          lineHeight: 1.1,
        }),
        layer({
          id: "number_tight",
          role: "metric",
          text: "ARR 120억 +35%",
          sizePx: 30,
          lineHeight: 1.15,
        }),
      ],
    });

    expect(report.passed).toBe(false);
    const codes = report.issues.map((issue) => issue.code);
    const layerIds = report.issues.map((issue) => issue.layerId);

    expect(codes.includes("font-size-too-small")).toBe(true);
    expect(codes.includes("line-height-too-tight")).toBe(true);
    expect(layerIds.includes("source_tiny")).toBe(true);
    expect(layerIds.includes("number_tight")).toBe(true);
  });

  test("fails long Korean lines in narrow text bounds", () => {
    const report = runKoreanTypographyBenchmark({
      layers: [
        layer({
          id: "body_wrap_risk",
          role: "body",
          text: "한국어문장이좁은텍스트영역에서줄바꿈없이길게이어지면검수에서차단되어야합니다",
          sizePx: 30,
          lineHeight: 1.42,
          boundsW: 180,
        }),
        ...readableBenchmarkLayers(),
      ],
    });

    expect(report.passed).toBe(false);
    expect(report.summary.lineWrapRiskCount).toBe(1);
    expect(report.issues.map((issue) => issue.code)).toEqual(["line-wrap-risk"]);
  });
});

type LayerInput = {
  readonly id: string;
  readonly role: string;
  readonly text: string;
  readonly sizePx: number;
  readonly lineHeight: number;
  readonly boundsW?: number;
};

function readableBenchmarkLayers(): readonly ReconstructedTextLayer[] {
  return [
    layer({
      id: "title_readable",
      role: "title",
      text: "한국 시장의 성장 기회",
      sizePx: 56,
      lineHeight: 1.16,
    }),
    layer({
      id: "body_readable",
      role: "body",
      text: "한글 줄바꿈과 행간이 안정적인 본문입니다.",
      sizePx: 30,
      lineHeight: 1.42,
    }),
    layer({
      id: "number_mixed",
      role: "metric",
      text: "ARR 120억 +35%",
      sizePx: 38,
      lineHeight: 1.42,
    }),
    layer({
      id: "source_readable",
      role: "source",
      text: "출처: 통계청, 2026",
      sizePx: 20,
      lineHeight: 1.32,
    }),
  ];
}

function layer(input: LayerInput): ReconstructedTextLayer {
  return {
    id: input.id,
    sourceLayerId: `source_${input.id}`,
    role: input.role,
    text: input.text,
    bounds: { x: 96, y: 96, w: input.boundsW ?? 640, h: 96 },
    editable: true,
    sourceIds: input.role === "source" ? ["src_001"] : [],
    datasetIds: [],
    sourceMapIds: input.role === "source" ? ["map_001"] : [],
    font: {
      family: "Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif",
      sizePx: input.sizePx,
      minPx: input.sizePx,
      maxPx: input.sizePx + 8,
      lineHeight: input.lineHeight,
      letterSpacing: "0em",
    },
    qualityLevel: "level2",
  };
}
