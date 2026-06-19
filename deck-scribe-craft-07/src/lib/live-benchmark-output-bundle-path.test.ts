import { describe, expect, test } from "bun:test";
import {
  LIVE_BENCHMARK_IDS,
  evaluateLiveBenchmarkEvidence,
  type LiveBenchmarkId,
  type LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const PACKAGE_SHA = "6890a91f9e2c1335e9954f2afa4f122d81540c691adedf585fc4f2e21643416a";

describe("live benchmark output bundle path", () => {
  test("blocks synthetic output bundle paths", () => {
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: LIVE_BENCHMARK_IDS.map((id) =>
        id === "korean_business"
          ? withOutputBundlePath(run(id, "passed"), "fixtures/korean_business.zip")
          : run(id, id === "revision_regeneration" ? "failed" : "passed"),
      ),
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_output_bundle"]);
  });

  test("blocks developer-local output bundle paths", () => {
    const result = evaluateLiveBenchmarkEvidence({
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: PACKAGE_SHA,
      runs: LIVE_BENCHMARK_IDS.map((id) =>
        id === "korean_business"
          ? withOutputBundlePath(run(id, "passed"), `/Users/jake/chatgppt/benchmarks/${id}.zip`)
          : run(id, id === "revision_regeneration" ? "failed" : "passed"),
      ),
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_output_bundle"]);
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

function withOutputBundlePath(run: LiveBenchmarkRun, path: string): LiveBenchmarkRun {
  return { ...run, outputBundlePath: path, outputBundle: { ...run.outputBundle, path } };
}
