import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkId,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "./live-golden-path-e2e-contract";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark regeneration image evidence", () => {
  test("blocks passed benchmark bundles that only include the five initial images", () => {
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
      "output_bundle_regeneration_image_missing",
    ]);
  });

  test("does not count regenerated benchmark images toward the five initial images", () => {
    // Given
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        withRegeneratedImage(run("korean_business", "passed"), [
          "korean_business_image_1",
          "korean_business_image_2",
          "korean_business_image_3",
          "korean_business_image_4",
          "korean_business_image_regenerated",
        ]),
        withRegeneratedImage(run("market_research", "passed")),
        withRegeneratedImage(run("chart_report", "passed")),
        withRegeneratedImage(run("image_intro", "passed")),
        run("revision_regeneration", "failed"),
      ],
    });

    // When / Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "output_bundle_golden_path_evidence_missing",
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
      screenshotPaths: status === "passed" ? screenshotPaths(id) : [],
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
          ? LIVE_BENCHMARK_IDS.map((_, index) => `${id}_request_${index + 1}`)
          : [],
    },
  };
}

function withRegeneratedImage(
  run: LiveBenchmarkRun,
  liveImageArtifactIds: readonly string[] = [
    `${run.id}_image_1`,
    `${run.id}_image_2`,
    `${run.id}_image_3`,
    `${run.id}_image_4`,
    `${run.id}_image_5`,
    `${run.id}_image_regenerated`,
  ],
): LiveBenchmarkRun {
  const regeneratedImageArtifactId = liveImageArtifactIds[liveImageArtifactIds.length - 1] ?? "";
  return {
    ...run,
    outputBundle: {
      ...run.outputBundle,
      imageArtifactCount: liveImageArtifactIds.length,
      liveImageArtifactIds,
      regeneratedLiveImageArtifactIds: [regeneratedImageArtifactId],
    },
  };
}

function screenshotPaths(id: string): readonly string[] {
  return LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${id}/${step}.png`);
}
