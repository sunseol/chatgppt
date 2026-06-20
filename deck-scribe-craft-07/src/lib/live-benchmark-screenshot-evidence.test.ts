import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkId,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "./live-golden-path-e2e-contract";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark screenshot evidence", () => {
  test("blocks passed benchmark bundles that only report a screenshot count", () => {
    // Given
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        run("korean_business", "passed"),
        run("market_research", "passed"),
        run("chart_report", "passed"),
        run("image_intro", "passed"),
        run("revision_regeneration", "failed"),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "output_bundle_evidence_count_mismatch",
      "output_bundle_golden_path_evidence_missing",
    ]);
  });

  test("blocks passed benchmark runs that reuse screenshot evidence", () => {
    // Given
    const sharedScreenshotPaths = screenshotPaths("shared");
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        withScreenshotPaths(run("korean_business", "passed"), sharedScreenshotPaths),
        withScreenshotPaths(run("market_research", "passed"), sharedScreenshotPaths),
        withScreenshotPaths(run("chart_report", "passed"), screenshotPaths("chart_report")),
        withScreenshotPaths(run("image_intro", "passed"), screenshotPaths("image_intro")),
        run("revision_regeneration", "failed"),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "duplicate_output_bundle_screenshot",
    ]);
  });

  test("blocks screenshot sets that do not name every Golden Path step", () => {
    // Given
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        withScreenshotPaths(
          run("korean_business", "passed"),
          numberedScreenshotPaths("korean_business"),
        ),
        withScreenshotPaths(
          run("market_research", "passed"),
          numberedScreenshotPaths("market_research"),
        ),
        withScreenshotPaths(run("chart_report", "passed"), numberedScreenshotPaths("chart_report")),
        withScreenshotPaths(run("image_intro", "passed"), numberedScreenshotPaths("image_intro")),
        run("revision_regeneration", "failed"),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "output_bundle_step_screenshot_missing",
    ]);
  });
});

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
      imageArtifactCount: status === "passed" ? 6 : 0,
      liveImageArtifactIds:
        status === "passed"
          ? [
              `${id}_image_1`,
              `${id}_image_2`,
              `${id}_image_3`,
              `${id}_image_4`,
              `${id}_image_5`,
              `${id}_image_regenerated`,
            ]
          : [],
      regeneratedLiveImageArtifactIds: status === "passed" ? [`${id}_image_regenerated`] : [],
      liveImageRequestIds:
        status === "passed"
          ? LIVE_BENCHMARK_IDS.map((_, index) => `${id}_request_${index + 1}`)
          : [],
    },
  };
}

function screenshotPaths(id: string): readonly string[] {
  return LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${id}/${step}.png`);
}

function numberedScreenshotPaths(id: string): readonly string[] {
  return Array.from({ length: 10 }, (_, index) => `screenshots/${id}/capture_${index + 1}.png`);
}

function withScreenshotPaths(
  run: LiveBenchmarkRun,
  screenshotPaths: readonly string[],
): LiveBenchmarkRun {
  return {
    ...run,
    outputBundle: { ...run.outputBundle, screenshotPaths },
  };
}
