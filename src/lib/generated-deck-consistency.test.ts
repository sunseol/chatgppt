import { describe, expect, test } from "bun:test";
import type { DeckConsistencyReport } from "./deck-consistency-checker";
import type { GeneratedSlideQaReport } from "./generated-slide-qa";
import { evaluateGeneratedDeckConsistency } from "./generated-deck-consistency";

describe("generated deck consistency benchmark", () => {
  test("passes the ten percent target with one style drift slide", () => {
    const report = evaluateGeneratedDeckConsistency({
      slideCount: 10,
      layoutConsistency: layoutConsistency([2]),
      slideQaReports: passingQaReports(),
      densityBySlide: balancedDensity(),
    });

    expect(report.status).toBe("passed");
    expect(report.summary.designViolationRate).toBe(0.1);
    expect(report.summary.targetPassed).toBe(true);
    expect(report.regenerationCandidates.map((candidate) => candidate.slideNumber)).toEqual([2]);
    expect(report.regenerationCandidates[0]?.reasons).toEqual(["layout-consistency"]);
  });

  test("fails when generated deck drift exceeds ten percent", () => {
    const report = evaluateGeneratedDeckConsistency({
      slideCount: 10,
      layoutConsistency: layoutConsistency([2]),
      slideQaReports: qaReportsWithFailures([3]),
      densityBySlide: [...balancedDensity(), { slideNumber: 4, layerCount: 16 }],
    });

    expect(report.status).toBe("failed");
    expect(report.summary.driftSlideCount).toBe(3);
    expect(report.summary.designViolationRate).toBe(0.3);
    expect(report.summary.targetPassed).toBe(false);
    expect(report.regenerationCandidates.map((candidate) => candidate.slideNumber)).toEqual([
      2, 3, 4,
    ]);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "layout-consistency",
      "image-qa",
      "density-variance",
    ]);
  });

  test("preserves layout image QA and density reasons on candidates", () => {
    const report = evaluateGeneratedDeckConsistency({
      slideCount: 10,
      layoutConsistency: layoutConsistency([5]),
      slideQaReports: qaReportsWithFailures([5]),
      densityBySlide: [...balancedDensity(), { slideNumber: 5, layerCount: 16 }],
    });

    expect(report.regenerationCandidates[0]?.slideNumber).toBe(5);
    expect(report.regenerationCandidates[0]?.reasons).toEqual([
      "layout-consistency",
      "image-qa",
      "density-variance",
    ]);
  });
});

function layoutConsistency(slideNumbers: readonly number[]): DeckConsistencyReport {
  return {
    status: slideNumbers.length === 0 ? "passed" : "failed",
    summary: {
      slideCount: 10,
      driftSlideCount: slideNumbers.length,
      violationRate: slideNumbers.length / 10,
      targetMaxDriftSlides: 2,
      targetPassed: slideNumbers.length <= 2,
    },
    issues: slideNumbers.map((slideNumber) => ({
      code: "safe-margin-breach",
      slideNumber,
      message: `Slide ${slideNumber} breached safe margin.`,
    })),
    regenerationCandidates: slideNumbers.map((slideNumber) => ({
      slideNumber,
      issueCodes: ["safe-margin-breach"],
      reason: `Slide ${slideNumber} has layout drift.`,
    })),
  };
}

function passingQaReports(): readonly SlideQaInput[] {
  return Array.from({ length: 10 }, (_, index) => ({
    slideNumber: index + 1,
    report: qaReport("passed"),
  }));
}

function qaReportsWithFailures(failedSlides: readonly number[]): readonly SlideQaInput[] {
  return passingQaReports().map((item) =>
    failedSlides.includes(item.slideNumber) ? { ...item, report: qaReport("failed") } : item,
  );
}

function balancedDensity(): readonly DensityInput[] {
  return Array.from({ length: 10 }, (_, index) => ({
    slideNumber: index + 1,
    layerCount: 6,
  }));
}

type SlideQaInput = {
  readonly slideNumber: number;
  readonly report: GeneratedSlideQaReport;
};

type DensityInput = {
  readonly slideNumber: number;
  readonly layerCount: number;
};

function qaReport(status: GeneratedSlideQaReport["status"]): GeneratedSlideQaReport {
  return {
    status,
    metrics: {
      sourceLessNumberCount: status === "failed" ? 1 : 0,
      unreadableTextLayerCount: 0,
      structureMismatchRate: status === "failed" ? 0.2 : 0,
    },
    issues: status === "failed" ? ["Generated slide QA failed."] : [],
  };
}
