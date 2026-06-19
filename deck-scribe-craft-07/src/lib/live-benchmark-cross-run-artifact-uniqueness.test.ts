import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkId,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "93b567bcdcc6dba485c6869f456068ceb7b4b1a8e434da7e3c91f49a5f7390e5";

describe("live benchmark cross-run artifact uniqueness", () => {
  test("blocks passed benchmark runs that reuse source, image, or request evidence", () => {
    // Given
    const reusedSourceIds = ["shared_source_1", "shared_source_2", "shared_source_3"];
    const reusedImageIds = [
      "shared_image_1",
      "shared_image_2",
      "shared_image_3",
      "shared_image_4",
      "shared_image_5",
    ];
    const reusedRequestIds = [
      "shared_request_1",
      "shared_request_2",
      "shared_request_3",
      "shared_request_4",
      "shared_request_5",
    ];
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        run("korean_business", "passed", reusedSourceIds, reusedImageIds, reusedRequestIds),
        run("market_research", "passed", reusedSourceIds, reusedImageIds, reusedRequestIds),
        run("chart_report", "passed"),
        run("image_intro", "passed"),
        run("revision_regeneration", "failed"),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "duplicate_output_bundle_source_artifact",
      "duplicate_output_bundle_image_artifact",
      "duplicate_output_bundle_image_request",
    ]);
  });

  test("blocks passed benchmark runs that reuse one Golden Path report", () => {
    const sharedReportPath = "golden-path/shared/live_e2e_report.md";
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        withGoldenPathReport(run("korean_business", "passed"), sharedReportPath),
        withGoldenPathReport(run("market_research", "passed"), sharedReportPath),
        run("chart_report", "passed"),
        run("image_intro", "passed"),
        run("revision_regeneration", "failed"),
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "duplicate_output_bundle_golden_path_report",
    ]);
    expect(result.issues[0]?.refs).toEqual([`korean_business:market_research:${sharedReportPath}`]);
  });
});

function run(
  id: LiveBenchmarkId,
  status: "passed" | "failed",
  sourceArtifactIds: readonly string[] = [`${id}_source_1`, `${id}_source_2`, `${id}_source_3`],
  liveImageArtifactIds: readonly string[] = [
    `${id}_image_1`,
    `${id}_image_2`,
    `${id}_image_3`,
    `${id}_image_4`,
    `${id}_image_5`,
  ],
  liveImageRequestIds: readonly string[] = LIVE_BENCHMARK_IDS.map(
    (_, index) => `${id}_request_${index + 1}`,
  ),
): LiveBenchmarkRun {
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
      sourceArtifactIds: status === "passed" ? sourceArtifactIds : [],
      imageArtifactCount: status === "passed" ? 5 : 0,
      liveImageArtifactIds: status === "passed" ? liveImageArtifactIds : [],
      liveImageRequestIds: status === "passed" ? liveImageRequestIds : [],
    },
  };
}

function withGoldenPathReport(
  run: LiveBenchmarkRun,
  goldenPathReportPath: string,
): LiveBenchmarkRun {
  return {
    ...run,
    outputBundle: { ...run.outputBundle, goldenPathReportPath },
  };
}
