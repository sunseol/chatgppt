import { describe, expect, test } from "bun:test";
import {
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkId,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "2204709ff25c811571357cfe9f5c6dbe99492fc0ef93c0a4505dc56d48e83fb6";

describe("live benchmark scenario report uniqueness", () => {
  test("blocks benchmark runs that reuse one scenario report", () => {
    // Given
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        withScenarioReport(passedRun("korean_business"), "reports/shared-scenario.md"),
        withScenarioReport(passedRun("market_research"), "reports/shared-scenario.md"),
        passedRun("chart_report"),
        passedRun("image_intro"),
        failedRun("revision_regeneration"),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_output_bundle_report"]);
  });
});

function passedRun(id: LiveBenchmarkId): LiveBenchmarkRun {
  return run(id, "passed");
}

function failedRun(id: LiveBenchmarkId): LiveBenchmarkRun {
  return run(id, "failed");
}

function run(id: LiveBenchmarkId, status: "passed" | "failed"): LiveBenchmarkRun {
  return {
    id,
    status,
    failureDomain: status === "passed" ? "none" : "editor",
    source: "live",
    score: status === "passed" ? 92 : 0,
    mockScore: 0,
    goldenPathCompleted: status === "passed",
    outputBundlePath: `bundles/${id}.zip`,
    outputBundle: {
      path: `bundles/${id}.zip`,
      benchmarkId: id,
      packageArchiveSha256: PACKAGE_SHA,
      reportPath: `reports/${id}.md`,
      goldenPathReportPath: `golden-path/${id}/live_e2e_report.md`,
      exportArtifactId: status === "passed" ? `${id}_export` : "",
      screenshotCount: status === "passed" ? 10 : 0,
      sourceCount: status === "passed" ? 3 : 0,
      sourceArtifactIds:
        status === "passed" ? [`${id}_source_1`, `${id}_source_2`, `${id}_source_3`] : [],
      imageArtifactCount: status === "passed" ? 5 : 0,
      liveImageArtifactIds:
        status === "passed"
          ? [`${id}_image_1`, `${id}_image_2`, `${id}_image_3`, `${id}_image_4`, `${id}_image_5`]
          : [],
      liveImageRequestIds:
        status === "passed"
          ? Array.from({ length: 5 }, (_, index) => `${id}_img_req_${index + 1}`)
          : [],
    },
  };
}

function withScenarioReport(run: LiveBenchmarkRun, reportPath: string): LiveBenchmarkRun {
  return {
    ...run,
    outputBundle: { ...run.outputBundle, reportPath },
  };
}
