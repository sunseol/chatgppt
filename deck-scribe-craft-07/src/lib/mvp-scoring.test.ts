import { describe, expect, test } from "bun:test";
import { completeBenchmark, completeProject } from "./mvp-scoring.fixture";
import { scoreMvpBenchmark, scoreMvpSuite } from "./mvp-scoring";

describe("MVP scoring harness", () => {
  test("scores a complete benchmark as release ready", () => {
    const result = scoreMvpBenchmark(completeBenchmark());

    expect(result.totalScore).toBe(100);
    expect(result.passed80).toBe(true);
    expect(result.releaseReady).toBe(true);
    expect(result.categories.every((category) => category.passed)).toBe(true);
  });

  test("records benchmark failure reasons for missing signals", () => {
    const result = scoreMvpBenchmark({
      ...completeBenchmark(),
      project: {
        ...completeProject(),
        slides: [],
        layers: undefined,
        exportPackage: undefined,
      },
      imageQaReports: [],
      generationReportMarkdown: "# Draft",
    });

    expect(result.totalScore < 100).toBe(true);
    expect(result.passed80).toBe(false);
    expect(result.failureReasons.some((reason) => reason.includes("image"))).toBe(true);
    expect(result.failureReasons.some((reason) => reason.includes("report"))).toBe(true);
    expect(result.failureReasons.some((reason) => reason.includes("editor"))).toBe(true);
  });

  test("blocks release readiness when fatal workflow errors remain", () => {
    const result = scoreMvpBenchmark({
      ...completeBenchmark(),
      project: {
        ...completeProject(),
        workflowErrors: [
          {
            id: "fatal_transform",
            kind: "transform",
            stage: "vectorize",
            cause: "Layer graph is inconsistent.",
            retryable: false,
            recoveryAction: "Regenerate editable layers.",
            blocksFinalApproval: true,
          },
        ],
      },
    });

    expect(result.totalScore).toBe(100);
    expect(result.passed80).toBe(true);
    expect(result.releaseReady).toBe(false);
    expect(result.fatalIssues[0]).toBe("vectorize transform: Layer graph is inconsistent.");
  });

  test("aggregates benchmark scores and failures", () => {
    const suite = scoreMvpSuite([
      completeBenchmark(),
      {
        ...completeBenchmark("seed_missing"),
        project: {
          ...completeProject(),
          slides: [],
          layers: undefined,
          exportPackage: undefined,
        },
        imageQaReports: [],
        generationReportMarkdown: "# Draft",
      },
    ]);

    expect(suite.benchmarkCount).toBe(2);
    expect(suite.passedBenchmarkCount).toBe(1);
    expect(suite.passRate).toBe(0.5);
    expect(suite.releaseReady).toBe(false);
    expect(suite.benchmarks[1]?.failureReasons.some((reason) => reason.includes("report"))).toBe(
      true,
    );
  });
});
