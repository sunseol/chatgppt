import { describe, expect, test } from "bun:test";
import type { GeneratedDeckConsistencyReport } from "./generated-deck-consistency";
import type { GeneratedSlideQaReport } from "./generated-slide-qa";
import { evaluateImageSlopQa } from "./image-slop-qa";

describe("image slop and style elevation QA", () => {
  test("passes clean final SVG with passing QA signals", () => {
    const report = evaluateImageSlopQa({
      slideNumber: 1,
      svg: cleanSvg(),
      slideQa: slideQa("passed"),
      deckConsistency: deckConsistency([]),
    });

    expect(report.status).toBe("passed");
    expect(report.recommendedAction).toBe("none");
    expect(report.issues).toEqual([]);
    expect(report.checklist.every((item) => item.status === "passed")).toBe(true);
  });

  test("fails broken text decorative noise fake graphs and web UI rhythm", () => {
    const report = evaluateImageSlopQa({
      slideNumber: 2,
      svg: [
        '<svg data-final-slide="2">',
        "<text>깨진 � 텍스트</text>",
        '<g data-role="sparkle-decoration"></g>',
        '<g data-layer-type="chart" data-source-map-ids=""></g>',
        '<foreignObject><button class="dashboard-card">Click</button></foreignObject>',
        "</svg>",
      ].join(""),
      slideQa: slideQa("failed"),
      deckConsistency: deckConsistency([]),
    });

    expect(report.status).toBe("failed");
    expect(report.recommendedAction).toBe("regenerate");
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "meaningless-decoration",
      "broken-text",
      "fake-graph",
      "web-ui-rhythm",
    ]);
  });

  test("fails design-system drift from generated deck consistency", () => {
    const report = evaluateImageSlopQa({
      slideNumber: 4,
      svg: cleanSvg(),
      slideQa: slideQa("passed"),
      deckConsistency: deckConsistency([4]),
    });

    expect(report.status).toBe("failed");
    expect(report.recommendedAction).toBe("regenerate");
    expect(report.issues.map((issue) => issue.code)).toEqual(["design-system-drift"]);
    expect(report.checklist.find((item) => item.code === "design-system-drift")?.status).toBe(
      "failed",
    );
  });
});

function cleanSvg(): string {
  return [
    '<svg data-final-slide="1">',
    '<image data-role="generated-background" data-locked="true" />',
    '<text data-layer-type="text">시장 기회</text>',
    '<g data-layer-type="chart" data-source-map-ids="map_001"></g>',
    "</svg>",
  ].join("");
}

function slideQa(status: GeneratedSlideQaReport["status"]): GeneratedSlideQaReport {
  return {
    status,
    metrics: {
      sourceLessNumberCount: 0,
      unreadableTextLayerCount: status === "failed" ? 1 : 0,
      structureMismatchRate: 0,
    },
    issues: status === "failed" ? ["Unreadable generated text."] : [],
  };
}

function deckConsistency(candidateSlides: readonly number[]): GeneratedDeckConsistencyReport {
  return {
    status: candidateSlides.length > 1 ? "failed" : "passed",
    summary: {
      slideCount: 10,
      driftSlideCount: candidateSlides.length,
      designViolationRate: candidateSlides.length / 10,
      targetViolationRate: 0.1,
      targetPassed: candidateSlides.length <= 1,
    },
    issues: candidateSlides.map((slideNumber) => ({
      code: "layout-consistency",
      slideNumber,
      message: "layout drift",
    })),
    regenerationCandidates: candidateSlides.map((slideNumber) => ({
      slideNumber,
      reasons: ["layout-consistency"],
    })),
  };
}
