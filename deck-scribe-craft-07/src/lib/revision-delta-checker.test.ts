import { describe, expect, test } from "bun:test";
import { checkRevisionDelta } from "./revision-delta-checker";

describe("revision mask and delta checker", () => {
  test("passes when preserve regions stay stable and requested change moves", () => {
    const report = checkRevisionDelta({
      ...baseInput(),
      regions: [
        region("title", "title text", "must_keep", 0.02),
        region("source", "source caption", "must_keep", 0.03),
        region("chart", "chart area size", "must_change", 0.42),
      ],
    });

    expect(report.status).toBe("passed");
    expect(report.recommendedAction).toBe("approve");
    expect(report.issues).toEqual([]);
    expect(report.historyEntry.summary.mustKeepChangedCount).toBe(0);
    expect(report.historyEntry.summary.requestedChangeHitCount).toBe(1);
  });

  test("fails large must-keep delta as unintended change", () => {
    const report = checkRevisionDelta({
      ...baseInput(),
      regions: [
        region("title", "title text", "must_keep", 0.41),
        region("source", "source caption", "must_keep", 0.04),
        region("chart", "chart area size", "must_change", 0.38),
      ],
    });

    expect(report.status).toBe("failed");
    expect(report.recommendedAction).toBe("request_revision");
    expect(report.issues.map((issue) => issue.code)).toEqual(["must-keep-large-delta"]);
    expect(report.reviewCandidates).toEqual([
      {
        regionId: "title",
        label: "title text",
        action: "request_revision",
        message: "title text changed 41% inside a must-keep region.",
      },
    ]);
  });

  test("warns when requested change region barely changed and stores history", () => {
    const report = checkRevisionDelta({
      ...baseInput(),
      regions: [
        region("title", "title text", "must_keep", 0.02),
        region("source", "source caption", "must_keep", 0.03),
        region("chart", "chart area size", "must_change", 0.01),
      ],
    });

    expect(report.status).toBe("warning");
    expect(report.recommendedAction).toBe("approve_with_warning");
    expect(report.issues.map((issue) => issue.code)).toEqual(["requested-change-missing"]);
    expect(report.historyEntry).toEqual({
      revisionId: "rev_103",
      slideNumber: 3,
      originalSlideVersion: 1,
      revisedSlideVersion: 2,
      createdAt: 789,
      summary: {
        totalRegionCount: 3,
        mustKeepRegionCount: 2,
        mustKeepChangedCount: 0,
        requestedChangeRegionCount: 1,
        requestedChangeHitCount: 0,
        maxMustKeepDeltaScore: 0.03,
      },
      issues: report.issues,
    });
  });
});

function baseInput() {
  return {
    revisionId: "rev_103",
    slideNumber: 3,
    originalSlideVersion: 1,
    revisedSlideVersion: 2,
    now: () => 789,
  };
}

function region(
  id: string,
  label: string,
  intent: "must_keep" | "must_change",
  deltaScore: number,
) {
  return {
    id,
    label,
    intent,
    deltaScore,
    beforeBounds: { x: 10, y: 10, w: 100, h: 40 },
    afterBounds: { x: 10, y: 10, w: 100, h: 40 },
  };
}
