import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkId,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live benchmark output bundle evidence counts", () => {
  test("blocks manifests whose evidence counts do not match their artifact lists", () => {
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: [
        withEvidenceCounts(run("korean_business", "passed"), {
          screenshotCount: 99,
          sourceCount: 9,
          imageArtifactCount: 99,
        }),
        run("market_research", "passed"),
        run("chart_report", "passed"),
        run("image_intro", "passed"),
        run("revision_regeneration", "failed"),
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "output_bundle_evidence_count_mismatch",
    ]);
    expect(result.issues[0]?.refs).toEqual([
      "korean_business:screenshots=99/10",
      "korean_business:sources=9/3",
      "korean_business:images=99/6",
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
  return Array.from({ length: 10 }, (_, index) => `screenshots/${id}/step_${index + 1}.png`);
}

function withEvidenceCounts(
  run: LiveBenchmarkRun,
  counts: Pick<
    LiveBenchmarkRun["outputBundle"],
    "imageArtifactCount" | "screenshotCount" | "sourceCount"
  >,
): LiveBenchmarkRun {
  return {
    ...run,
    outputBundle: { ...run.outputBundle, ...counts },
  };
}
