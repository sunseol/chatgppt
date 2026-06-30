import { describe, expect, test } from "bun:test";
import {
  VISUAL_RELEASE_COUNCIL_REVIEWERS,
  evaluateVisualReleaseCouncil,
  type VisualReleaseCouncilReview,
  type VisualReleaseHardGate,
} from "./visual-release-council";

describe("visual release council readout", () => {
  test("records a 98 plus advisory score only after deterministic hard gates pass", () => {
    const result = evaluateVisualReleaseCouncil({
      hardGates: hardGates(),
      reviews: reviews(),
    });

    expect(result.hardGateStatus).toBe("passed");
    expect(result.councilAdvisoryStatus).toBe("target_met");
    expect(result.reviewerCount).toBe(7);
    expect(result.minimumScore).toBe(98);
    expect(result.averageScore).toBe(98.9);
    expect(result.alerts).toEqual([]);
  });

  test("keeps failed deterministic gates separate from advisory council scores", () => {
    const result = evaluateVisualReleaseCouncil({
      hardGates: [
        ...hardGates(),
        { id: "pixel-diff", passed: false, evidencePath: ".omx/artifacts/pixel-diff.json" },
      ],
      reviews: reviews(),
    });

    expect(result.hardGateStatus).toBe("blocked");
    expect(result.councilAdvisoryStatus).toBe("target_met");
    expect(result.alerts.map((alert) => alert.code)).toEqual(["hard_gate_failed"]);
  });

  test("flags missing reviewers, low scores, missing evidence, and unresolved blocking defects", () => {
    const result = evaluateVisualReleaseCouncil({
      hardGates: [{ id: "layout-ir", passed: true, evidencePath: "" }],
      reviews: [
        {
          reviewerId: "agy",
          score: 97,
          evidencePath: "",
          defects: [
            {
              severity: "P1",
              slideNumber: 2,
              description: "Source label overlaps the chart.",
              resolved: false,
            },
          ],
        },
      ],
    });

    expect(result.hardGateStatus).toBe("blocked");
    expect(result.councilAdvisoryStatus).toBe("target_not_met");
    expect(result.alerts.map((alert) => alert.code)).toEqual([
      "missing_hard_gate_evidence",
      "missing_reviewer",
      "missing_reviewer",
      "missing_reviewer",
      "missing_reviewer",
      "missing_reviewer",
      "missing_reviewer",
      "review_score_below_target",
      "missing_review_evidence",
      "blocking_defect_reported",
    ]);
  });
});

function hardGates(): readonly VisualReleaseHardGate[] {
  return [
    { id: "layout-ir", passed: true, evidencePath: ".omx/artifacts/layout-ir.json" },
    { id: "web-render", passed: true, evidencePath: ".omx/artifacts/web-render.json" },
    { id: "pptx-structure", passed: true, evidencePath: ".omx/artifacts/pptx-structure.json" },
  ];
}

function reviews(): readonly VisualReleaseCouncilReview[] {
  return VISUAL_RELEASE_COUNCIL_REVIEWERS.map((reviewerId, index) => ({
    reviewerId,
    score: index === 0 ? 98 : 99,
    evidencePath: `.omx/artifacts/visual-council/${reviewerId}.json`,
    defects: [],
  }));
}
